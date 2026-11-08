"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Building2, Calendar, Check, CheckSquare, ClipboardList, Eye, HelpCircle, Hourglass, Leaf, MessageSquare, Share2, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api, { errMsg } from "../../lib/api";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  single: { label: "Single Choice", icon: <Check className="w-3.5 h-3.5" />, color: "text-teal-700 bg-teal-50 border-teal-100" },
  multiple: { label: "Multiple Choice", icon: <CheckSquare className="w-3.5 h-3.5" />, color: "text-blue-700 bg-blue-50 border-blue-100" },
  yesno: { label: "Yes / No", icon: <HelpCircle className="w-3.5 h-3.5" />, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  survey: { label: "Community Survey", icon: <ClipboardList className="w-3.5 h-3.5" />, color: "text-purple-700 bg-purple-50 border-purple-100" },
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  community: { color: "bg-blue-50 text-blue-700 border-blue-100", icon: <Users className="w-3 h-3" /> },
  environment: { color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <Leaf className="w-3 h-3" /> },
  events: { color: "bg-purple-50 text-purple-700 border-purple-100", icon: <Calendar className="w-3 h-3" /> },
  infrastructure: { color: "bg-amber-50 text-amber-700 border-amber-100", icon: <Building2 className="w-3 h-3" /> },
  general: { color: "bg-slate-50 dark:bg-[#0b1215] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1e3040]", icon: <MessageSquare className="w-3 h-3" /> },
};

const MAX_CHANGES = 2;

/** Horizontal bar chart (replaces chart.js to keep the bundle small). */
function BarChart({ options, total }: { options: any[]; total: number }) {
  const max = Math.max(...options.map((o) => o.votes || 0), 0);
  return (
    <div className="w-full space-y-2.5 py-1" role="img" aria-label="Poll results chart">
      {options.map((o) => {
        const pct = total > 0 ? Math.round(((o.votes || 0) / total) * 100) : 0;
        const winner = (o.votes || 0) === max && max > 0;
        return (
          <div key={o.id} title={`${o.text}: ${o.votes || 0} ${o.votes === 1 ? "vote" : "votes"} (${pct}%)`}>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              <span className="truncate pr-2">{o.text}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-[18px] rounded-md bg-slate-100 dark:bg-[#14241d] overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className={`h-full rounded-md ${winner ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PollCard({ poll, onChanged }: { poll: any; onChanged?: () => void }) {
  const { user, role, isMember } = useAuth();
  const [local, setLocal] = useState(poll);
  const [showResults, setShowResults] = useState(false);
  const [changing, setChanging] = useState(false);
  const [chartView, setChartView] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setLocal(poll), [poll]);

  const now = Date.now();
  const hasEnded = local.status === "ended" || (!!local.endsAt && new Date(local.endsAt).getTime() < now);
  const isPending = local.status === "pending";
  const isAdmin = role === "admin";
  const isLocked = isPending && !isAdmin;
  const voted = !!local.hasVoted;
  const changeCount = local.myVote?.changeCount || 0;
  const selected: string[] = local.myVote?.optionIds || [];
  const total = local.totalVotes || 0;
  const typeConf = TYPE_CONFIG[local.type] || TYPE_CONFIG.single;
  const catConf = CATEGORY_CONFIG[(local.category || "").toLowerCase()];
  const showResultsNow = (showResults || voted || hasEnded) && !changing;

  const vote = async (optionId: string) => {
    if (!user) return toast.error("Please login to vote");
    if (!isMember) return toast.error("Access Denied: Only members and volunteers are allowed to vote in community polls.");
    if (hasEnded) return toast.error("This poll has ended.");
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/polls/${local._id}/vote`, { optionIds: [optionId] });
      toast.success(changing ? "Your vote has been updated!" : "Your vote has been recorded!");
      setLocal(data.poll);
      setShowResults(true);
      setChanging(false);
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err, "Failed to submit vote"));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await api.patch(`/polls/${local._id}/approve`);
      toast.success("Poll approved and published successfully!");
      setLocal({ ...local, status: "active" });
      onChanged?.();
    } catch (err) {
      toast.error(errMsg(err, "Failed to approve poll"));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/polls#${local._id}`);
      toast.success("Poll link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const timeRemaining = () => {
    if (!local.endsAt) return "No Time Limit";
    if (hasEnded) return "Ended";
    const diff = new Date(local.endsAt).getTime() - now;
    if (isNaN(diff)) return "No Time Limit";
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
  };
  const remaining = timeRemaining();
  const maxVotes = Math.max(...local.options.map((o: any) => o.votes || 0), 0);

  return (
    <motion.div
      id={local._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg border border-slate-200 dark:border-[#1e3040]/80 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full ${isLocked ? "opacity-60 saturate-50 select-none pointer-events-none" : ""}`}
    >
      <div className="p-5 border-b border-slate-100 dark:border-[#14241d] bg-slate-50 dark:bg-[#0b1215]/20">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border ${typeConf.color}`}>{typeConf.icon}</div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${typeConf.color}`}>{typeConf.label}</span>
            {local.category && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${catConf?.color || "bg-slate-50 dark:bg-[#0b1215] text-slate-500 dark:text-slate-300 border-slate-200 dark:border-[#1e3040]"}`}>
                {catConf?.icon}
                <span>{local.category}</span>
              </span>
            )}
            {isPending && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Pending Approval</span>}
          </div>
          <button onClick={share} className="text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-[#1e3040] p-1 rounded-lg transition-colors shrink-0 cursor-pointer" title="Copy Poll Link" aria-label="Copy poll link">
            <Share2 className="w-[1.125rem] h-[1.125rem]" />
          </button>
        </div>

        <h3 className="text-[13px] font-bold text-slate-800 dark:text-white leading-snug mb-3 tracking-tight">{local.question}</h3>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-teal-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0 border border-teal-100">{local.createdBy ? local.createdBy.slice(0, 2).toUpperCase() : "C"}</div>
            <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={local.createdBy}>
              {local.createdBy ? local.createdBy.split("@")[0] : "Community"}
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-slate-500 dark:text-slate-300 shrink-0">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>
                {total} {total === 1 ? "vote" : "votes"}
              </span>
            </div>
            {remaining === "No Time Limit" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 dark:bg-[#0b1215] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-[#1e3040] uppercase tracking-tight">No Time Limit</span>
            ) : remaining === "Ended" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#1e3040] text-slate-400 border border-slate-200 dark:border-[#1e3040] uppercase tracking-tight">Ended</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 uppercase tracking-tight shrink-0">
                <Hourglass className="w-3 h-3 text-red-500" />
                <span>Ends in: {remaining}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        {isPending ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
              <Hourglass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-white">Pending Admin Approval</h4>
              <p className="font-medium text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-[220px] mx-auto leading-relaxed">
                {isAdmin ? "Review this poll's content and options below before publishing it to the community." : "This poll will become active once it is verified by community administrators."}
              </p>
            </div>
            {isAdmin && (
              <>
                <button onClick={approve} disabled={busy} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95">
                  {busy ? "Approving..." : "Approve & Publish"}
                </button>
                <div className="w-full pt-3 space-y-1.5 text-left border-t border-slate-100 dark:border-[#14241d]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Options Preview</span>
                  {local.options.map((o: any) => (
                    <div key={o.id} className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-3.5 py-2 bg-slate-50 dark:bg-[#0b1215] rounded-lg border border-slate-100 dark:border-[#14241d]">
                      {o.text}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : !showResultsNow ? (
          <div className="space-y-2.5">
            {local.options.map((o: any) => (
              <button
                key={o.id}
                onClick={() => vote(o.id)}
                disabled={hasEnded || busy}
                aria-label={`Vote for ${o.text}`}
                className="w-full p-3.5 rounded-[12px] border border-slate-200 dark:border-[#1e3040] hover:border-emerald-500 hover:bg-emerald-50/5 transition-all text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 group-hover:border-emerald-500 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-emerald-500 transition-colors" />
                  </div>
                  <span className="flex-1 text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1] group-hover:text-emerald-900 dark:group-hover:text-emerald-300">{o.text}</span>
                </div>
              </button>
            ))}
            {changing && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setChanging(false);
                    setShowResults(true);
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {chartView || local.type === "survey" ? (
              <BarChart options={local.options} total={total} />
            ) : (
              local.options.map((o: any) => {
                const pct = total > 0 ? Math.round(((o.votes || 0) / total) * 100) : 0;
                const winner = (o.votes || 0) === maxVotes && maxVotes > 0;
                const mine = selected.includes(o.id);
                return (
                  <div key={o.id} className={`relative overflow-hidden rounded-[12px] border p-3.5 transition-all flex items-center justify-between ${winner ? "border-emerald-500 font-bold text-emerald-950 dark:text-emerald-200" : "border-slate-200 dark:border-[#1e3040] text-slate-700 dark:text-[#cbd5e1]"}`}>
                    <div className={`absolute inset-0 -z-20 ${winner ? "bg-emerald-50/30 dark:bg-emerald-950/20" : "bg-slate-50 dark:bg-[#0b1215]/20"}`} />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className={`absolute inset-y-0 left-0 -z-10 rounded-l-[11px] ${pct >= 98 ? "rounded-r-[11px]" : ""} ${winner ? "bg-emerald-500/15" : "bg-slate-200/50 dark:bg-slate-700/30"}`} />
                    <div className="flex items-center gap-2.5 z-10 min-w-0">
                      {mine && <Check className={`w-4 h-4 shrink-0 ${winner ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-300"}`} />}
                      <span className="text-[13px] truncate pr-2 font-semibold">{o.text}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs z-10 shrink-0 font-bold">
                      <span>{pct}%</span>
                      <span className={`text-[10px] font-normal ${winner ? "text-emerald-800/70 dark:text-emerald-300/70" : "text-slate-400"}`}>({o.votes || 0})</span>
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#14241d] mt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300 font-semibold">
                <Eye className="w-3.5 h-3.5" />
                <span>Results visible</span>
              </div>
              <div className="flex items-center gap-3">
                {local.type !== "survey" && (
                  <button onClick={() => setChartView(!chartView)} className="text-xs font-bold text-slate-500 dark:text-slate-300 hover:text-teal-600 transition-colors cursor-pointer">
                    {chartView ? "View List" : "View Chart"}
                  </button>
                )}
                {!local.endsAt && voted && changeCount < MAX_CHANGES && !hasEnded && (
                  <button
                    onClick={() => {
                      setChanging(true);
                      setShowResults(false);
                    }}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
                  >
                    Change Vote ({MAX_CHANGES - changeCount} left)
                  </button>
                )}
                {!voted && !hasEnded && (
                  <button onClick={() => setShowResults(false)} className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors cursor-pointer">
                    Vote instead
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
