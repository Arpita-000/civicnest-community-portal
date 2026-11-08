"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { BarChart3, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, Clock, HelpCircle, MessageCircle, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api, { errMsg } from "../../lib/api";

const POLL_TYPES = [
  { value: "single", label: "Single Choice", icon: <Check className="w-5 h-5" />, description: "Choose one option" },
  { value: "multiple", label: "Multiple Choice", icon: <CheckSquare className="w-5 h-5" />, description: "Select multiple options" },
  { value: "yesno", label: "Yes / No", icon: <HelpCircle className="w-5 h-5" />, description: "Simple yes or no" },
];
const CATEGORIES = ["Community", "Environment", "Events", "Infrastructure", "General"];
const PRESETS = [
  { label: "1 Hour", value: 1 },
  { label: "6 Hours", value: 6 },
  { label: "12 Hours", value: 12 },
  { label: "1 Day", value: 24 },
  { label: "3 Days", value: 72 },
  { label: "1 Week", value: 168 },
  { label: "2 Weeks", value: 336 },
  { label: "1 Month", value: 720 },
];

const field =
  "w-full bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-medium text-slate-700 dark:text-[#cbd5e1]";

const blank = { question: "", type: "single", options: ["", ""], category: "General", durationType: "custom", customHours: 24, selectedPreset: 24, allowAnonymous: false };

export default function CreatePollModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { user, role } = useAuth();
  const [form, setForm] = useState(blank);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const total = 4;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const close = () => {
    onClose();
    setForm(blank);
    setStep(1);
  };

  const validOptions = form.type === "yesno" ? ["Yes", "No"] : form.options.map((o) => o.trim()).filter(Boolean);

  const next = () => {
    if (step === 1 && form.question.trim().length < 3) return toast.error("Please enter a question (at least 3 characters)");
    if (step === 2 && validOptions.length < 2) return toast.error("Please enter at least 2 options");
    if (step === 2 && new Set(validOptions.map((o) => o.toLowerCase())).size !== validOptions.length) return toast.error("Options must be different from each other");
    setStep((s) => Math.min(total, s + 1));
  };

  const submit = async () => {
    if (!user) return toast.error("Please log in to create a poll");
    if (role !== "member" && role !== "admin") return toast.error("Only members can create polls");
    const hours = form.durationType === "custom" ? form.customHours : form.selectedPreset;
    if (!(hours > 0)) return toast.error("Duration must be greater than 0");

    setBusy(true);
    try {
      const endsAt = new Date(Date.now() + hours * 3600000).toISOString();
      const { data } = await api.post("/polls", {
        question: form.question.trim(),
        type: form.type,
        options: validOptions.map((text) => ({ text })),
        category: form.category,
        endsAt,
        allowAnonymous: form.allowAnonymous,
      });
      toast.success(data.status === "pending" ? "Poll submitted! It will go live once an admin approves it." : "Poll created successfully!", { duration: 5000 });
      onCreated();
      close();
    } catch (err) {
      toast.error(errMsg(err, "Failed to create poll"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
          role="dialog"
          aria-modal="true"
          aria-label="Create new poll"
        >
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-[#0a120e]">
            <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 px-8 py-6 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-10">
                <BarChart3 className="absolute top-4 right-8 w-32 h-32 text-white" />
                <MessageCircle className="absolute bottom-4 left-8 w-24 h-24 text-white" />
                <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Create New Poll</h3>
                </div>
                <p className="text-white/80 text-[13px]">Engage the community with questions</p>
              </div>
              <button onClick={close} aria-label="Close" className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${step >= s ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white" : "bg-slate-200 dark:bg-[#1e3040] text-slate-500 dark:text-slate-300"}`}>{step > s ? <CheckCircle2 className="w-4 h-4" /> : s}</div>
                    {s < 4 && <div className={`w-12 h-1 rounded-full transition-all ${step > s ? "bg-gradient-to-r from-teal-600 to-emerald-600" : "bg-slate-200 dark:bg-[#1e3040]"}`} />}
                  </React.Fragment>
                ))}
              </div>

              <div className="min-h-[360px]">
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="poll-q" className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] mb-2 block">Question *</label>
                      <textarea id="poll-q" rows={3} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="What would you like to ask the community?" className={`${field} resize-none`} maxLength={300} />
                      <p className="text-xs text-slate-400 text-right mt-1">{form.question.length}/300</p>
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] mb-3 block">Poll Type</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {POLL_TYPES.map((t) => (
                          <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value, options: ["", ""] })} className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center text-center gap-2 cursor-pointer ${form.type === t.value ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-semibold shadow-md" : "border-slate-200 dark:border-[#1e3040] bg-white dark:bg-[#0a120e] text-slate-500 dark:text-slate-300 hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-950/20"}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${form.type === t.value ? "bg-teal-100 text-teal-700" : "bg-slate-100 dark:bg-[#1e3040] text-slate-500 dark:text-slate-300"}`}>{t.icon}</div>
                            <span className="font-bold text-[13px]">{t.label}</span>
                            <span className="text-xs text-slate-400 font-medium leading-tight">{t.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block">Options * {form.type === "yesno" && "(automatically set to Yes/No)"}</label>
                    {form.type === "yesno" ? (
                      <div className="p-4 bg-slate-50 dark:bg-[#0b1215] rounded-xl border-2 border-slate-200 dark:border-[#1e3040] text-center text-slate-500 dark:text-slate-300 font-medium">Yes/No polls automatically have &quot;Yes&quot; and &quot;No&quot; options</div>
                    ) : (
                      <div className="space-y-3">
                        {form.options.map((o, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={o} maxLength={200} onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Option ${i + 1}`} className={`flex-1 ${field}`} />
                            {form.options.length > 2 && (
                              <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })} className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-semibold cursor-pointer">
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {form.options.length < 8 && (
                          <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ""] })} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-[#1e3040] rounded-xl text-slate-500 dark:text-slate-300 hover:border-teal-400 hover:text-teal-600 transition-all font-medium cursor-pointer">
                            + Add Option
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="poll-cat" className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] mb-2 block">Category</label>
                      <select id="poll-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${field} py-3.5 appearance-none cursor-pointer`}>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] mb-2 block">Duration</label>
                      {form.durationType === "custom" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <input type="number" min={1} max={8760} value={form.customHours} onChange={(e) => setForm({ ...form, customHours: Math.min(8760, parseInt(e.target.value) || 1) })} className={`flex-1 ${field}`} placeholder="Enter hours" aria-label="Duration in hours" />
                            <span className="text-slate-500 dark:text-slate-300 font-medium text-[13px]">hours</span>
                          </div>
                          <button type="button" onClick={() => setForm({ ...form, durationType: "preset" })} className="text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer">Use presets instead</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select value={form.selectedPreset} onChange={(e) => setForm({ ...form, selectedPreset: parseInt(e.target.value) })} className={`${field} py-3.5 appearance-none cursor-pointer`} aria-label="Duration preset">
                            {PRESETS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setForm({ ...form, durationType: "custom" })} className="text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer">Set custom hours</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-[#0b1215] rounded-xl border-2 border-slate-200 dark:border-[#1e3040] space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Question</span>
                        <p className="text-slate-800 dark:text-white font-medium">{form.question}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase">Type</span>
                          <p className="text-slate-800 dark:text-white font-medium capitalize">{form.type}</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase">Category</span>
                          <p className="text-slate-800 dark:text-white font-medium">{form.category}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Duration</span>
                        <p className="text-slate-800 dark:text-white font-medium">{form.durationType === "custom" ? `${form.customHours} hours` : PRESETS.find((p) => p.value === form.selectedPreset)?.label}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Options</span>
                        <ul className="text-slate-800 dark:text-white font-medium text-[13px] mt-1 list-disc pl-5">
                          {validOptions.map((o, i) => (
                            <li key={i}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-[#0b1215] rounded-xl border-2 border-slate-200 dark:border-[#1e3040]">
                      <input type="checkbox" id="allowAnonymous" checked={form.allowAnonymous} onChange={(e) => setForm({ ...form, allowAnonymous: e.target.checked })} className="w-5 h-5 rounded border-2 border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500/10 cursor-pointer" />
                      <label htmlFor="allowAnonymous" className="text-[13px] font-medium text-slate-700 dark:text-[#cbd5e1] cursor-pointer">Allow anonymous votes</label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-6 mt-6 border-t-2 border-slate-100 dark:border-[#14241d]">
                {step === 1 ? (
                  <button type="button" onClick={close} className="px-6 py-3 font-bold text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">Cancel</button>
                ) : (
                  <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-6 py-3 font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                {step === total ? (
                  <button type="button" onClick={submit} disabled={busy} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {busy ? "Creating..." : "Create Poll"}
                  </button>
                ) : (
                  <button type="button" onClick={next} className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all cursor-pointer">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
