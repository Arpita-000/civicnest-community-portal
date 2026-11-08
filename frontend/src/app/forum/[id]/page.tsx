"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { MinimalLoader } from "../../../components/ui";

export default function ThreadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadThread = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/forum/${id}`, { fresh: true });
      setThread(res.data);
    } catch {
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to reply");
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await api.post(`/forum/${id}/reply`, { body: replyText });
      setReplyText("");
      toast.success("Reply posted!");
      loadThread();
    } catch (err) {
      toast.error(errMsg(err, "Failed to post reply"));
    } finally {
      setPosting(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) return toast.error("Please sign in to upvote");
    try {
      await api.post(`/forum/${id}/upvote`);
      loadThread();
    } catch (err) {
      toast.error(errMsg(err, "Vote failed"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MinimalLoader />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Thread Not Found</h2>
        <Link href="/forum" className="mt-4 text-teal-600 font-bold hover:underline">
          ← Back to Discussions
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f2] dark:bg-[#050907] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/forum" className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline mb-6">
          <i className="ri-arrow-left-line" /> All Community Threads
        </Link>

        <div className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-[#14241d] shadow-sm mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
              #{thread.category || "General"}
            </span>
            <span className="text-xs text-slate-400">
              {thread.createdAt ? new Date(thread.createdAt).toLocaleString() : ""}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">{thread.title}</h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed mb-6">{thread.body}</p>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#14241d]">
            <span className="text-xs text-slate-500">
              Started by <strong className="text-slate-800 dark:text-white">{thread.posterName || "Neighbor"}</strong>
            </span>
            <button
              onClick={handleUpvote}
              className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-[#14241d] hover:bg-emerald-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ri-thumb-up-line text-emerald-600" /> {thread.upvotes?.length || 0} Upvotes
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 border border-slate-200 dark:border-[#14241d] shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">
            Replies ({thread.replies?.length || 0})
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-[#14241d]">
            {(thread.replies || []).map((rep: any, idx: number) => (
              <div key={rep._id || idx} className="py-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 dark:text-white">{rep.authorName || rep.senderName || "Member"}</span>
                  <span className="text-slate-400">
                    {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{rep.body || rep.text}</p>
              </div>
            ))}
          </div>

          {!thread.isLocked && (
            <form onSubmit={handleReply} className="pt-4 border-t border-slate-100 dark:border-[#14241d] flex gap-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a helpful reply..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] text-sm"
              />
              <button
                type="submit"
                disabled={posting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {posting ? "Sending..." : "Reply"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

