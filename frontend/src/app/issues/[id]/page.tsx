"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { displayName, formatDateTime } from "../../../lib/format";
import { BackButton, FlairPill, MinimalLoader, StatusBadge } from "../../../components/ui";
import { CommentBox, CommentList } from "../../../components/comments";

const FALLBACK_IMG = "/demo/issue-placeholder.svg";

function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  if (!images?.length) return null;
  const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!e.currentTarget.src.endsWith(FALLBACK_IMG)) e.currentTarget.src = FALLBACK_IMG;
  };
  return (
    <div className="mb-2">
      <div className="relative w-full h-[400px] md:h-[500px] rounded-t-[1.5rem] overflow-hidden bg-slate-900 shadow-inner group">
        <AnimatePresence mode="wait">
          <motion.img
            key={index}
            src={images[index]}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onError={onError}
            className="w-full h-full object-contain"
            alt={`Issue photo ${index + 1}`}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button aria-label="Previous photo" onClick={() => setIndex((p) => (p === 0 ? images.length - 1 : p - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-sm cursor-pointer">
              <i className="ri-arrow-left-s-line text-2xl tracking-tight"></i>
            </button>
            <button aria-label="Next photo" onClick={() => setIndex((p) => (p === images.length - 1 ? 0 : p + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-sm cursor-pointer">
              <i className="ri-arrow-right-s-line text-2xl tracking-tight"></i>
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 px-4 custom-scrollbar">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIndex(i)} className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${index === i ? "ring-2 ring-[#40826D] ring-offset-2 scale-105" : "opacity-60 hover:opacity-100"}`}>
              <img src={img} onError={onError} className="w-full h-full object-cover" alt={`Thumbnail ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IssueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, dbUser } = useAuth();

  const [issue, setIssue] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [voting, setVoting] = useState(false);
  const [anim, setAnim] = useState<{ id: number; target: string; value: string; color: string } | null>(null);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [complaintLetter, setComplaintLetter] = useState<string | null>(null);
  const [donateModal, setDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState(500);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [issRes, comRes]: any = await Promise.all([api.get(`/issues/${id}`, { fresh: true }), api.get(`/issues/${id}/comments`, { fresh: true })]);
      setIssue(issRes.data ?? issRes);
      setComments(Array.isArray(comRes.data) ? comRes.data : Array.isArray(comRes) ? comRes : []);
      setState("ready");
    } catch (err: any) {
      setState(err?.response?.status === 404 || err?.response?.status === 400 ? "missing" : "error");
    }
  }, [id, user?.uid]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!user) return toast.error("Please login to vote");
    if (voting) return;
    setVoting(true);
    try {
      const res: any = await api.patch(`/issues/${id}/${type}`);
      const data = res.data ?? res;
      const before = (type === "upvote" ? issue.upvotes : issue.downvotes)?.length || 0;
      const after = (type === "upvote" ? data.upvotes : data.downvotes)?.length || 0;
      if (after !== before) {
        const diff = after - before;
        setAnim({ id: Date.now(), target: type, value: diff > 0 ? `+${diff}` : `${diff}`, color: diff > 0 ? (type === "upvote" ? "text-emerald-500" : "text-rose-400") : "text-slate-400" });
        setTimeout(() => setAnim(null), 1000);
      }
      setIssue({ ...issue, upvotes: data.upvotes, downvotes: data.downvotes, userVote: data.userVote, netScore: data.netScore });
    } catch (err) {
      toast.error(errMsg(err, "Vote failed"));
    } finally {
      setVoting(false);
    }
  };

  const handleWitness = async () => {
    if (!user) return toast.error("Please login to witness this report");
    try {
      const res: any = await api.post(`/issues/${id}/witness`, { photoURL: user.photoURL || "", name: user.displayName || "User" });
      const data = res.data ?? res;
      setIssue({ ...issue, witnesses: data.witnesses, witnessDetails: data.witnessDetails });
    } catch (err) {
      toast.error(errMsg(err, "Could not update your witness status"));
    }
  };

  const handleAiSummarize = async () => {
    setLoadingAi(true);
    try {
      const res: any = await api.post("/ai/summarize", {
        title: issue.title,
        description: issue.description,
        comments: comments.map((c) => c.text || c.content),
      });
      const data = res.data ?? res;
      setAiSummary(data.summary || "CivicBot analyzed this issue and recommends community inspection.");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateLetter = async () => {
    setLoadingAi(true);
    try {
      const res: any = await api.post("/ai/generate-letter", {
        title: issue.title,
        category: issue.category,
        location: issue.location || issue.area,
        description: issue.description,
        senderName: dbUser?.name || user?.displayName || "Concerned Citizen",
      });
      const data = res.data ?? res;
      setComplaintLetter(data.letter || "");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoadingAi(false);
    }
  };

  const handleClaimIssue = async () => {
    if (!user) return toast.error("Please sign in to claim this issue");
    try {
      await api.post(`/issues/${id}/claim`, {});
      toast.success("Issue claimed! You can now coordinate the resolution.");
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleVerifyFix = async () => {
    if (!user) return toast.error("Please sign in to verify fixes");
    try {
      await api.post(`/issues/${id}/verify`, {});
      toast.success("Verification recorded! +10 Civic Points");
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to contribute");
    try {
      await api.post(`/issues/${id}/donate`, { amount: donateAmount });
      toast.success(`Thank you for contributing ৳${donateAmount}!`);
      setDonateModal(false);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const share = (platform: "x" | "fb" | "wa") => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(issue.title);
    const target = { x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`, fb: `https://www.facebook.com/sharer/sharer.php?u=${url}`, wa: `https://wa.me/?text=${text}%20${url}` }[platform];
    window.open(target, "_blank", "noopener");
  };

  if (state === "loading") {
    return (
      <div className="text-center py-32">
        <MinimalLoader />
      </div>
    );
  }
  if (state !== "ready") {
    return (
      <div className="text-center py-32 px-4">
        <i className={`${state === "missing" ? "ri-file-search-line" : "ri-wifi-off-line"} text-5xl text-slate-300`}></i>
        <h2 className="text-2xl tracking-tight font-bold mt-3 text-slate-800 dark:text-white">{state === "missing" ? "Issue not found." : "We couldn't load this report."}</h2>
        <p className="text-[13px] text-slate-500 dark:text-slate-300 mt-1">{state === "missing" ? "It may have been removed or is awaiting approval." : "Check your connection and try again."}</p>
        <div className="mt-6 flex justify-center gap-3">
          {state === "error" && (
            <button onClick={load} className="px-6 py-2.5 text-[13px] font-bold text-white bg-[#0f766e] hover:bg-[#0d645d] rounded-full cursor-pointer">
              Try again
            </button>
          )}
          <Link href="/issues" className="px-6 py-2.5 text-[13px] font-bold text-[#0f766e] bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 rounded-full">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const approved = issue.approvalStatus === "approved";
  const isReporter = !!user && (issue.submittedBy?.userId === user.uid || issue.submittedBy?.email === user.email);
  const authorName = issue.isAnonymous && !isReporter ? "CivicNest Guardian" : displayName(issue.submittedBy?.name, issue.submittedBy?.email) || "User";
  const authorPhoto = issue.submittedBy?.photoURL;
  const authorId = issue.submittedBy?.userId;
  const upCount = issue.upvotes?.length || 0;
  const downCount = issue.downvotes?.length || 0;
  const witnessed = !!user && !!issue.witnesses?.includes(user.uid);
  const cf = issue.crowdfunding;
  const raised = cf?.raisedAmount || issue.raisedAmount || 0;
  const goal = cf?.targetAmount || issue.amount || 0;
  const claimable = approved && issue.status === "open" && !issue.assignedTo?.email && !isReporter;
  const proofs = issue.resolutionProofs?.length || 0;

  const commentActions = {
    added: (c: any) => {
      setComments((prev) => [...prev, c]);
      setIssue((p: any) => ({ ...p, commentCount: (p.commentCount || 0) + 1 }));
    },
    updated: (c: any) => setComments((prev) => prev.map((x) => (x._id === c._id ? { ...x, ...c } : x))),
    deleted: (cid: string) => {
      setComments((prev) => prev.filter((x) => x._id !== cid));
      setIssue((p: any) => ({ ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) }));
    },
  };

  const voteBtn = (type: "upvote" | "downvote") => {
    const up = type === "upvote";
    const active = issue.userVote === (up ? "up" : "down");
    const count = up ? upCount : downCount;
    return (
      <div className="relative">
        <AnimatePresence>
          {anim?.target === type && (
            <motion.span key={anim.id} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -25, scale: 1.2 }} exit={{ opacity: 0, y: -40, scale: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} className={`absolute top-0 left-1/2 -translate-x-1/2 font-extrabold ${anim.color} pointer-events-none drop-shadow-sm z-10`}>
              {anim.value}
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => handleVote(type)}
          disabled={!approved || isReporter || voting}
          title={isReporter ? "You can't vote on your own report" : undefined}
          aria-pressed={active}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all font-bold text-[13px] border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            active
              ? up
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 shadow-sm"
                : "text-rose-500 bg-rose-50 border-rose-200 shadow-sm"
              : `text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border-slate-200 dark:border-[#1e3040] hover:bg-slate-50 dark:hover:bg-[#0b1215] ${up ? "hover:text-emerald-600" : "hover:text-rose-500"}`
          }`}
        >
          <i className={`${up ? "ri-thumb-up" : "ri-thumb-down"}-${active ? "fill" : "line"} text-[13px]`}></i>
          <span className="hidden sm:inline">{up ? "Upvote" : "Downvote"}</span>
          {count > 0 && <span className={`ml-1 px-2 py-0.5 rounded-md text-xs ${active ? (up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") : "bg-slate-100 dark:bg-[#1e3040] text-slate-500 dark:text-slate-300"}`}>{count}</span>}
        </button>
      </div>
    );
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#050a08] min-h-screen font-body text-[#111] dark:text-slate-100 pt-10 pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6 mb-6 flex items-center gap-3">
        <BackButton variant="dark" />
        <span className="text-slate-500 dark:text-slate-300 font-bold">Back to Feed</span>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 px-4 md:px-6">
        {/* Main column */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex-grow flex flex-col gap-4 min-w-0">
          {!approved && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-[13px] font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <i className="ri-time-line mt-0.5"></i>
              {issue.approvalStatus === "rejected" ? `This report was rejected: ${issue.rejectReason || "it does not meet community guidelines."}` : "Only you can see this report right now. It is pending admin review and will appear in the feed once approved."}
            </div>
          )}

          <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg shadow-sm border border-slate-200 dark:border-[#1e3040] overflow-hidden">
            {issue.images?.length > 0 && (
              <div className="bg-slate-50 dark:bg-[#0b1215] rounded-t-[1.5rem]">
                <div className="rounded-t-[1.5rem] overflow-hidden">
                  <ImageCarousel images={issue.images} />
                </div>
              </div>
            )}

            <div className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <FlairPill category={issue.category} customFlair={issue.customFlair} />
                    <StatusBadge status={issue.status} />
                    {issue.isStale && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 uppercase tracking-wider" title={`Open for ${issue.daysOpen} days`}>
                        <i className="ri-alarm-warning-line"></i> Overdue
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight" style={{ fontFamily: "HKGrotesk, sans-serif" }}>
                    {issue.title}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-slate-500 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-[#0b1215]/50 p-3 rounded-lg border border-slate-100 dark:border-[#14241d]">
                <div className="flex items-center gap-2">
                  {issue.isAnonymous && !isReporter ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#1e3040] border border-slate-300 dark:border-[#1e3040] flex items-center justify-center text-slate-500 dark:text-slate-300">
                        <i className="ri-spy-fill"></i>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-[#cbd5e1]">{authorName}</span>
                    </>
                  ) : (
                    <Link href={`/user/${authorId}`} className="flex items-center gap-2 group/author">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1e3040] border border-slate-200 dark:border-[#1e3040] overflow-hidden flex items-center justify-center text-slate-400 group-hover/author:ring-2 ring-[#0f766e] transition-all">
                        {authorPhoto ? <img src={authorPhoto} alt="Author" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <i className="ri-user-line text-[13px]"></i>}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white group-hover/author:text-[#0f766e] transition-colors">{authorName}</span>
                    </Link>
                  )}
                </div>
                <div className="h-4 w-px bg-slate-300 dark:bg-[#1e3040] hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <i className="ri-calendar-event-line text-slate-400 text-[13px]"></i>
                  <span className="font-medium">{formatDateTime(issue.submittedAt || issue.incidentDate)}</span>
                </div>
                <div className="h-4 w-px bg-slate-300 dark:bg-[#1e3040] hidden sm:block"></div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <i className="ri-map-pin-line text-slate-400 text-[13px]"></i>
                  <span className="font-medium max-w-[300px] sm:max-w-[500px] truncate" title={issue.location ? `${issue.area} • ${issue.location}` : issue.area}>
                    {issue.area}
                    {issue.location ? ` • ${String(issue.location).split(",").slice(0, 3).join(",")}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 mb-6">
                <button type="button" onClick={handleAiSummarize} disabled={loadingAi} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-[#0f766e] dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-100/50 transition-all cursor-pointer">
                  <i className="ri-sparkles-line"></i> {loadingAi ? "Thinking..." : "AI Summary"}
                </button>
                <button type="button" onClick={handleGenerateLetter} disabled={loadingAi} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 hover:bg-blue-100/50 transition-all cursor-pointer">
                  <i className="ri-file-text-line"></i> Generate Official Complaint
                </button>
              </div>

              {aiSummary && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <div className="font-extrabold text-[#0f766e] uppercase tracking-wider mb-1">CivicBot AI Summary</div>
                  {aiSummary}
                </div>
              )}

              <div className="max-w-none text-slate-700 dark:text-[#cbd5e1] text-[13px] leading-relaxed whitespace-pre-wrap font-medium mb-8">{issue.description}</div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-[#14241d]">
                <div className="flex items-center gap-3">
                  {voteBtn("upvote")}
                  {voteBtn("downvote")}
                </div>

                <div className="relative flex items-center mt-2 sm:mt-0">
                  <button
                    onClick={handleWitness}
                    disabled={!approved}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold text-[13px] border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      witnessed ? "bg-teal-50 border-teal-200 text-[#0f766e] shadow-sm" : "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border-slate-200 dark:border-[#1e3040] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0b1215]"
                    }`}
                  >
                    <i className={witnessed ? "ri-checkbox-circle-fill text-[13px]" : "ri-eye-line text-[13px]"}></i>
                    {witnessed ? "Witnessed" : "Witness"}
                  </button>
                  {issue.witnesses?.length > 0 && (
                    <div className="flex -space-x-1.5 absolute -left-2 -bottom-2 z-10">
                      {issue.witnesses.slice(0, 5).map((uid: string, i: number) => {
                        const photo = issue.witnessDetails?.find((d: any) => d.userId === uid)?.photoURL;
                        return (
                          <div key={uid || i} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#1e3040] border-2 border-white dark:border-[#0a120e] flex items-center justify-center overflow-hidden shadow-sm" style={{ zIndex: 10 - i }}>
                            {photo ? <img src={photo} alt="witness" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <i className="ri-user-fill text-slate-400 text-[10px]"></i>}
                          </div>
                        );
                      })}
                      {issue.witnesses.length > 5 && <div className="w-6 h-6 rounded-full bg-white dark:bg-[#0a120e] border-2 border-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">+{issue.witnesses.length - 5}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Discussion */}
          <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg shadow-sm border border-slate-200 dark:border-[#1e3040] p-4 md:p-5" id="comments">
            <h3 className="text-[13px] tracking-tight font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2" style={{ fontFamily: "HKGrotesk, sans-serif" }}>
              <i className="ri-chat-3-fill text-[#0f766e]"></i> Discussion ({issue.commentCount || 0})
            </h3>
            <CommentList comments={comments} issue={issue} actions={commentActions} />
            {approved ? (
              <div className="mt-8 border-t border-slate-100 dark:border-[#14241d] pt-6">
                <CommentBox issueId={issue._id} onAdded={commentActions.added} />
              </div>
            ) : (
              <div className="mt-8 border-t border-slate-100 dark:border-[#14241d] pt-6 text-center">
                <p className="text-slate-500 dark:text-slate-300 font-medium text-[13px] flex items-center justify-center gap-2">
                  <i className="ri-lock-fill text-[13px]"></i>
                  Comments are disabled until this post is approved by an administrator.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="lg:w-[320px] xl:w-[360px] flex-shrink-0 flex flex-col gap-5">
          {(cf?.enabled || goal > 0) && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <div className="text-center mb-5 relative z-10">
                <div className="w-14 h-14 bg-white dark:bg-[#0a120e] text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm border border-emerald-100 dark:border-emerald-900/40">
                  <i className="ri-hand-coin-fill text-2xl tracking-tight"></i>
                </div>
                <h3 className="font-bold text-[13px] tracking-tight text-emerald-900 dark:text-emerald-200" style={{ fontFamily: "HKGrotesk, sans-serif" }}>
                  Community Fund
                </h3>
                <p className="text-xs font-medium text-emerald-700/80 dark:text-emerald-300/80 mt-1">{cf?.purpose || "Support this community fix"}</p>
              </div>
              <div className="my-6 relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 block mb-1">Raised</span>
                    <span className="text-2xl tracking-tight font-bold text-emerald-800 dark:text-emerald-200">৳{raised}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 block mb-1">Goal</span>
                    <span className="text-[13px] font-bold text-emerald-900/50 dark:text-emerald-200/50">৳{goal}</span>
                  </div>
                </div>
                <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full h-2.5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((raised / Math.max(goal, 1)) * 100, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }} className="bg-emerald-500 h-full rounded-full" />
                </div>
              </div>
              <button onClick={() => setDonateModal(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-3.5 rounded-xl shadow-sm shadow-emerald-600/20 transition-all relative z-10 flex items-center justify-center gap-2 cursor-pointer">
                <i className="ri-heart-3-fill"></i> Contribute Now
              </button>
            </div>
          )}

          {claimable && (
            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl p-5 border border-teal-200 dark:border-teal-900/50 shadow-sm relative overflow-hidden">
              <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl flex items-center justify-center mb-3">
                <i className="ri-tools-line text-[13px] tracking-tight"></i>
              </div>
              <h3 className="font-bold text-[13px] text-slate-900 dark:text-white mb-1 tracking-tight" style={{ fontFamily: "HKGrotesk, sans-serif" }}>
                Take Action
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-4 leading-relaxed">Be the hero. Claim this issue, resolve the problem in your community, and earn rewards and reputation.</p>
              <button onClick={handleClaimIssue} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-[13px] cursor-pointer">
                <i className="ri-hand-sanitizer-fill"></i> Claim Issue
              </button>
            </div>
          )}

          {issue.assignedTo?.email && (
            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl p-5 border border-slate-200 dark:border-[#1e3040] shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <i className="ri-user-settings-fill text-[13px]"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-0.5 text-[13px]">Under Resolution</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Currently assigned to <span className="font-bold text-blue-600">{issue.assignedTo.name}</span>
                  </p>
                  {issue.assignedTo.deadline && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-slate-50 dark:bg-[#0b1215] border border-slate-100 dark:border-[#14241d] text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                      <i className="ri-timer-line"></i> Due {new Date(issue.assignedTo.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(proofs > 0 || issue.status === "action_taken") && issue.status !== "solved" && issue.status !== "resolved" && (
            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl p-5 border border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden">
              <h3 className="font-bold text-[13px] mb-1.5 flex items-center gap-2 text-amber-900 dark:text-amber-300 relative z-10 tracking-tight" style={{ fontFamily: "HKGrotesk, sans-serif" }}>
                <i className="ri-shield-check-fill text-amber-500"></i> Verify Fix
              </h3>
              <p className="text-amber-700/80 dark:text-amber-300/70 mb-5 text-xs font-medium leading-relaxed relative z-10">We need 3 community members to verify the fix before closing this issue.</p>
              <div className="mb-5 relative z-10 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-100/50 dark:border-amber-900/30">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-2">
                  <span>Progress</span>
                  <span>{(issue.verifiedBy || issue.verifications || []).length} / 3</span>
                </div>
                <div className="w-full bg-amber-100 dark:bg-amber-900/40 rounded-full h-1.5">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((((issue.verifiedBy || issue.verifications || []).length) / 3) * 100, 100)}%` }}></div>
                </div>
              </div>
              <button onClick={handleVerifyFix} className="w-full py-2.5 bg-amber-500 text-white hover:bg-amber-600 font-bold text-[13px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                <i className="ri-check-double-line"></i> Verify Now
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl p-5 border border-slate-200 dark:border-[#1e3040] shadow-sm text-center">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-[10px] uppercase tracking-widest">Share issues across platforms</h4>
            <div className="flex justify-center gap-4">
              <button aria-label="Share on X" onClick={() => share("x")} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] hover:bg-black hover:border-black hover:text-white transition-colors text-slate-500 dark:text-slate-300 shadow-sm cursor-pointer">
                <i className="ri-twitter-x-line text-[13px]"></i>
              </button>
              <button aria-label="Share on Facebook" onClick={() => share("fb")} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] hover:bg-[#4267B2] hover:border-[#4267B2] hover:text-white transition-colors text-slate-500 dark:text-slate-300 shadow-sm cursor-pointer">
                <i className="ri-facebook-fill text-[13px]"></i>
              </button>
              <button aria-label="Share on WhatsApp" onClick={() => share("wa")} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] hover:bg-[#25D366] hover:border-[#25D366] hover:text-white transition-colors text-slate-500 dark:text-slate-300 shadow-sm cursor-pointer">
                <i className="ri-whatsapp-line text-[13px]"></i>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Complaint Letter Modal */}
      {complaintLetter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a120e] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-3">Official Municipal Complaint Letter</h3>
            <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-[#0b1215] p-4 rounded-xl border border-slate-200 max-h-80 overflow-y-auto font-sans text-slate-700 dark:text-slate-200">
              {complaintLetter}
            </pre>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(complaintLetter);
                  toast.success("Copied to clipboard!");
                }}
                className="px-4 py-2 rounded-xl bg-[#0f766e] text-white text-xs font-bold"
              >
                Copy Letter
              </button>
              <button onClick={() => setComplaintLetter(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {donateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a120e] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">Contribute to Community Fix</h3>
            <form onSubmit={handleDonate} className="space-y-4">
              <input
                type="number"
                min={50}
                value={donateAmount}
                onChange={(e) => setDonateAmount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDonateModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                  Confirm ৳{donateAmount}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
