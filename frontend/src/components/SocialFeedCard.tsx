"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api, { errMsg } from "../lib/api";
import { displayName, formatDateTime } from "../lib/format";
import { FlairPill, StatusBadge } from "./ui";

const FALLBACK_IMG = "/demo/issue-placeholder.svg";
const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (!img.src.endsWith(FALLBACK_IMG)) img.src = FALLBACK_IMG;
};

type VoteAnim = { id: number; target: "upvote" | "downvote"; value: string; color: string };

const SocialFeedCard = React.forwardRef<HTMLDivElement, { issue: any }>(function SocialFeedCard({ issue }, ref) {
  const { user } = useAuth();
  const [local, setLocal] = useState(issue);
  const [anim, setAnim] = useState<VoteAnim | null>(null);
  const [voting, setVoting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocal(issue), [issue]);

  useEffect(() => {
    const close = (e: MouseEvent) => shareRef.current && !shareRef.current.contains(e.target as Node) && setShareOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const isEvent = local._type === "cleanup_event";
  const isPending = local.approvalStatus === "pending_review";
  const isRejected = local.approvalStatus === "rejected" || local.status === "rejected";
  const isLocked = isPending || isRejected;
  const href = isEvent ? `/cleanup-events/${local._id}` : `/issues/${local._id}`;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!user) return toast.error("Please login to vote");
    if (voting) return;
    setVoting(true);
    try {
      const { data } = await api.patch(`/issues/${local._id}/${type}`);
      const before = type === "upvote" ? local.upvotes?.length || 0 : local.downvotes?.length || 0;
      const after = type === "upvote" ? data.upvotes.length : data.downvotes.length;
      const diff = after - before;
      if (diff !== 0) {
        setAnim({
          id: Date.now(),
          target: type,
          value: diff > 0 ? `+${diff}` : `${diff}`,
          color: diff > 0 ? (type === "upvote" ? "text-emerald-500" : "text-rose-400") : "text-slate-400",
        });
        setTimeout(() => setAnim(null), 1000);
      }
      setLocal({ ...local, upvotes: data.upvotes, downvotes: data.downvotes, userVote: data.userVote, netScore: data.netScore });
    } catch (err) {
      toast.error(errMsg(err, "Vote failed"));
    } finally {
      setVoting(false);
    }
  };

  const handleShare = (platform: "fb" | "twitter" | "copy") => {
    const url = `${window.location.origin}/issues/${local._id}`;
    if (platform === "copy") {
      navigator.clipboard?.writeText(url).then(() => toast.success("Link copied to clipboard!"), () => toast.error("Could not copy the link"));
    } else if (platform === "fb") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener");
    } else {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(local.title)}`, "_blank", "noopener");
    }
    setShareOpen(false);
  };

  const formattedDate = formatDateTime(local.submittedAt || local.createdAt || local.incidentDate || local.eventDate);
  const authorName = local.isAnonymous
    ? "CivicNest Guardian"
    : displayName(local.submittedBy?.name, local.submittedBy?.email) || displayName(local.organizer?.name, local.organizer?.email) || "Community Member";
  const authorPhoto = local.submittedBy?.photoURL || local.organizer?.photoURL;
  const authorId = local.submittedBy?.userId;
  const hasImages = !isEvent && local.images && local.images.length > 0;
  const displayArea = local.area || local.location?.area;
  const displayLocation = typeof local.location === "string" ? local.location : local.location?.address;
  const upCount = local.upvotes?.length || 0;
  const downCount = local.downvotes?.length || 0;
  const cf = local.crowdfunding;

  let stateCls = "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d]/80 backdrop-blur-xl border-white/60 dark:border-[#14241d] shadow-lg hover:shadow-xl";
  if (isEvent) stateCls = "bg-gradient-to-br from-teal-50/90 to-emerald-50/90 dark:from-[#0d1d18] dark:to-[#0a120e] backdrop-blur-xl border-teal-200/60 dark:border-teal-900/40 shadow-md hover:shadow-lg ring-1 ring-teal-500/20";
  else if (isLocked) stateCls = "bg-slate-100 dark:bg-[#1e3040]/60 backdrop-blur-md border-slate-200 dark:border-[#1e3040]/50 shadow-sm grayscale-[30%]";

  const avatar = (
    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1e3040] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white dark:border-[#0a120e] shadow-sm text-slate-400">
      {local.isAnonymous ? (
        <i className="ri-spy-fill text-[13px] tracking-tight"></i>
      ) : authorPhoto ? (
        <img src={authorPhoto} alt="Author" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => ((e.currentTarget.style.display = "none"))} />
      ) : (
        <i className="ri-user-smile-line text-[13px] tracking-tight"></i>
      )}
    </div>
  );

  const canLinkAuthor = !local.isAnonymous && authorId && authorId !== "hidden" && !isEvent;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border transition-all duration-300 overflow-hidden relative group mb-6 ${stateCls}`}
    >
      {isLocked && <div className="absolute inset-0 bg-slate-900/5 z-10 pointer-events-none"></div>}

      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex justify-between items-start relative z-20 gap-3">
        <div className="flex gap-4 items-center min-w-0">
          {canLinkAuthor ? (
            <Link href={`/user/${authorId}`} className="hover:ring-2 ring-[#028090] rounded-full transition-all">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {canLinkAuthor ? (
                <Link href={`/user/${authorId}`} className="font-bold text-slate-800 dark:text-white text-[16px] leading-tight hover:text-[#028090] transition-colors">
                  {authorName}
                </Link>
              ) : (
                <span className="font-bold text-slate-800 dark:text-white text-[16px] leading-tight">{authorName}</span>
              )}
              {local.isAnonymous && <i className="ri-spy-fill text-slate-400 text-xs" title="Anonymous"></i>}
              <span className="text-slate-300 text-xs mx-1">•</span>
              <span className="text-[13px] font-medium text-slate-500 dark:text-slate-300">{formattedDate}</span>
            </div>
            <div className="text-[13px] text-slate-500 dark:text-slate-300 font-medium mt-1 flex items-center gap-1.5">
              <i className="ri-map-pin-2-fill text-slate-400"></i>
              <span className="truncate max-w-[220px] sm:max-w-[350px]">
                {displayArea}
                {displayLocation ? ` • ${displayLocation.split(",").slice(0, 2).join(",")}` : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isLocked && <i className="ri-lock-2-fill text-slate-400 text-[13px] mr-1" title="Locked"></i>}
          {isEvent ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-teal-600 text-white shadow-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">event</span>
              Community Event
            </span>
          ) : (
            <FlairPill category={local.category} customFlair={local.customFlair} />
          )}
          {!isEvent && <StatusBadge status={local.status} />}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4 relative z-20">
        <Link href={href} className="block group-hover:opacity-90 transition-opacity">
          <h3 className="text-[20px] font-extrabold text-slate-800 dark:text-white mb-2 leading-snug tracking-tight">{local.title}</h3>
          <p className="text-slate-600 dark:text-slate-300 text-[16px] leading-relaxed line-clamp-4">{local.description}</p>
        </Link>
      </div>

      {/* Image */}
      {hasImages && (
        <div className="w-full relative bg-slate-100 dark:bg-[#1e3040]/50 mt-1 z-20">
          <Link href={href}>
            <img src={local.images[0]} alt={local.title} loading="lazy" onError={onImgError} className={`w-full h-[300px] sm:h-[400px] object-cover ${isLocked ? "opacity-70" : ""}`} />
          </Link>
          {local.images.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md border border-white/20">
              <i className="ri-image-2-line mr-1"></i> 1 / {local.images.length}
            </div>
          )}
        </div>
      )}

      {isPending && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#0b1215]/80 border-t border-slate-200 dark:border-[#1e3040]/60 relative z-20">
          <p className="text-slate-600 dark:text-slate-300 font-medium text-[13px] flex items-start gap-2">
            <i className="ri-error-warning-fill text-slate-400 text-[13px]"></i>
            This post is pending admin review. No activity until approved.
          </p>
        </div>
      )}
      {isRejected && (
        <div className="px-6 py-4 bg-rose-50/80 border-t border-rose-200/60 relative z-20">
          <p className="text-rose-700 font-bold text-[13px] mb-1 flex items-center gap-1.5">
            <i className="ri-close-circle-fill text-[13px]"></i> Admin Feedback
          </p>
          <p className="text-rose-600/90 text-[13px] ml-6 italic">&quot;{local.rejectReason || "Does not meet community guidelines."}&quot;</p>
        </div>
      )}

      {!isLocked && (
        <>
          {cf?.enabled && (
            <div className="px-6 py-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 border-y border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-between gap-5 relative z-20">
              <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold text-[13px] whitespace-nowrap">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shadow-sm">
                  <i className="ri-hand-coin-fill text-emerald-600 text-[13px]"></i>
                </div>
                <span>৳{cf.raisedAmount || 0}</span>
                <span className="text-emerald-900/40 dark:text-emerald-300/40 font-normal text-xs uppercase tracking-tight">/ ৳{cf.targetAmount || 0}</span>
              </div>
              <div className="w-full bg-emerald-100 dark:bg-emerald-900/40 rounded-full h-1.5 mt-1 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(((cf.raisedAmount || 0) / Math.max(cf.targetAmount || 1, 1)) * 100, 100)}%` }}></div>
              </div>
            </div>
          )}

          <div className={`px-6 py-4 flex items-center gap-4 relative z-20 ${!hasImages && !cf?.enabled ? "border-t border-slate-100/80 dark:border-[#14241d]" : ""}`}>
            {!isEvent && (
              <div className="flex items-center gap-2">
                {(["upvote", "downvote"] as const).map((type) => {
                  const isUp = type === "upvote";
                  const active = local.userVote === (isUp ? "up" : "down");
                  const count = isUp ? upCount : downCount;
                  return (
                    <div className="relative" key={type}>
                      <AnimatePresence>
                        {anim?.target === type && (
                          <motion.span
                            key={`${type}-${anim.id}`}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -25, scale: 1.2 }}
                            exit={{ opacity: 0, y: -40, scale: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`absolute top-0 left-1/2 -translate-x-1/2 font-extrabold ${anim.color} pointer-events-none drop-shadow-sm z-10`}
                          >
                            {anim.value}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={() => handleVote(type)}
                        disabled={voting}
                        aria-label={isUp ? "Upvote" : "Downvote"}
                        aria-pressed={active}
                        className={`flex items-center justify-center h-10 px-3 sm:px-4 rounded-full transition-all font-bold text-[13px] border cursor-pointer disabled:opacity-60 ${
                          active
                            ? isUp
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200 shadow-sm"
                              : "text-rose-500 bg-rose-50 border-rose-200 shadow-sm"
                            : `text-slate-500 dark:text-slate-300 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border-slate-200 dark:border-[#1e3040] hover:bg-slate-50 dark:hover:bg-[#0b1215] ${isUp ? "hover:text-emerald-600" : "hover:text-rose-500"}`
                        }`}
                      >
                        <i className={`${isUp ? "ri-arrow-up-circle" : "ri-arrow-down-circle"}-${active ? "fill" : "line"} text-[20px]`}></i>
                        {count > 0 && (
                          <span
                            className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${
                              active ? (isUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") : "bg-slate-100 dark:bg-[#1e3040] text-slate-500 dark:text-slate-300"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href={href}
              className={`flex items-center justify-center gap-2 ${
                isEvent ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d]/60 text-slate-600 dark:text-slate-300"
              } rounded-full px-5 h-10 transition-all duration-300 border border-slate-200 dark:border-[#1e3040] shadow-sm font-bold`}
            >
              {isEvent ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                  <span className="text-[15px]">View Event</span>
                </>
              ) : (
                <>
                  <i className="ri-chat-3-fill text-[20px] text-slate-400"></i>
                  <span className="text-[15px]">{local.commentCount || 0} Comments</span>
                </>
              )}
            </Link>

            {!isEvent && (
              <div className="relative ml-auto" ref={shareRef}>
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className="flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-[#0a120e] rounded-full px-4 h-10 text-slate-500 dark:text-slate-300 transition-all duration-300 font-bold border border-transparent hover:border-slate-200 dark:hover:border-[#1e3040] hover:shadow-sm cursor-pointer"
                >
                  <i className="ri-share-forward-fill text-[20px] text-slate-400"></i>
                  <span className="text-[13px] hidden sm:inline uppercase tracking-wider">Share</span>
                </button>
                <AnimatePresence>
                  {shareOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full right-0 mb-2 w-36 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg shadow-lg border border-slate-200 dark:border-[#1e3040] py-1.5 z-30 overflow-hidden"
                    >
                      <button onClick={() => handleShare("fb")} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1] hover:bg-[#40826D]/10 hover:text-[#40826D] transition-colors flex items-center gap-2 cursor-pointer">
                        <i className="ri-facebook-circle-fill text-blue-600"></i> Facebook
                      </button>
                      <button onClick={() => handleShare("twitter")} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1] hover:bg-[#40826D]/10 hover:text-[#40826D] transition-colors flex items-center gap-2 cursor-pointer">
                        <i className="ri-twitter-x-line text-slate-900 dark:text-white"></i> X (Twitter)
                      </button>
                      <button onClick={() => handleShare("copy")} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1] hover:bg-[#40826D]/10 hover:text-[#40826D] transition-colors flex items-center gap-2 cursor-pointer">
                        <i className="ri-link text-slate-500 dark:text-slate-300"></i> Copy Link
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
});

export default SocialFeedCard;
