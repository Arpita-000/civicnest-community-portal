"use client";

import React, { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import api, { errMsg } from "../../lib/api";
import { BackButton } from "../../components/ui";

export default function CivicBotPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    issueType: "",
    severity: "",
    details: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const issueTypes = ["Garbage & Waste", "Road Damage", "Utility Issue", "Social Problem", "Animal Help"];
  const severities = ["Low (Not urgent)", "Medium (Needs attention)", "High (Urgent)", "Emergency"];

  const getAIRecommendations = async () => {
    setLoading(true);
    try {
      const mode = answers.issueType === "Animal Help" ? "animal-tip" : "issue-helper";
      const messageText = `I want to report an issue. Type: ${answers.issueType}. Severity: ${answers.severity}. Details: ${answers.details}`;
      const res = await api.post("/ai/chat", {
        messages: [{ role: "user", content: messageText }],
        mode,
      });

      setResult({
        greeting: "Analysis Complete!",
        category: answers.issueType,
        priority: answers.severity,
        draft: res.data?.response || "",
        tips: [
          "Include clear photos when you submit this issue.",
          "Tag the exact location on the map.",
          "Check if neighbors have already reported a similar issue.",
        ],
      });
      toast.success("AI draft recommendation generated!");
    } catch (err) {
      toast.error(errMsg(err, "Failed to generate AI recommendations."));
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return answers.issueType !== "";
    if (step === 1) return answers.severity !== "";
    if (step === 2) return answers.details.length > 5;
    return false;
  };

  return (
    <div className="min-h-screen pt-16 pb-12 px-[5%] bg-slate-50 dark:bg-[#050a08] text-slate-800 dark:text-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block bg-white dark:bg-slate-800/60 border border-teal-500/20 px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <span className="text-teal-600 dark:text-teal-400 text-[13px] font-bold tracking-wider flex items-center gap-2">
              <i className="ri-robot-2-fill" /> Powered by Civic AI
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-3">
            CivicBot Assistant
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-[13px] font-medium">
            Let me help you draft a highly effective community report.
          </p>
        </div>

        {!result && !loading && (
          <div className="bg-white dark:bg-[#0a120e] rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 max-w-3xl mx-auto">
            {step === 0 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  What kind of issue are you reporting? ✨
                </h3>
                <div className="flex flex-wrap gap-3">
                  {issueTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setAnswers({ ...answers, issueType: t })}
                      className={`px-6 py-3 rounded-full border font-bold cursor-pointer transition ${
                        answers.issueType === t
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-transparent shadow-md"
                          : "bg-slate-50 dark:bg-[#0b1215] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">How severe is this issue?</h3>
                <div className="flex flex-wrap gap-3">
                  {severities.map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setAnswers({ ...answers, severity: sev })}
                      className={`px-6 py-3 rounded-full border font-bold cursor-pointer transition ${
                        answers.severity === sev
                          ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white border-transparent shadow-md"
                          : "bg-slate-50 dark:bg-[#0b1215] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">Any specific details?</h3>
                <textarea
                  rows={4}
                  value={answers.details}
                  onChange={(e) => setAnswers({ ...answers, details: e.target.value })}
                  placeholder="E.g. Large pile of construction waste blocking the pedestrian walkway near Sector 7..."
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 font-bold text-xs disabled:opacity-40 cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => (step === 2 ? getAIRecommendations() : setStep(step + 1))}
                disabled={!canProceed()}
                className="px-8 py-2.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
              >
                {step === 2 ? "✨ Generate Draft" : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-xl font-extrabold text-teal-600">AI is drafting your report...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-4 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 text-xs font-bold">
                  Category: {result.category}
                </span>
                <span className="px-4 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-bold">
                  Priority: {result.priority}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-teal-600 mb-3">Recommended Report Draft</h3>
              <div className="bg-slate-50 dark:bg-[#0b1215] p-5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm whitespace-pre-line leading-relaxed">
                {result.draft}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.draft);
                    toast.success("Draft copied to clipboard!");
                  }}
                  className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Copy Draft
                </button>
                <button
                  onClick={() => {
                    setStep(0);
                    setResult(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Draft Another
                </button>
                <Link
                  href={answers.issueType === "Animal Help" ? "/animals/add" : "/issues/add"}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Go to Report Form →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-10">
          <BackButton variant="dark">Return to Dashboard</BackButton>
        </div>
      </div>
    </div>
  );
}

