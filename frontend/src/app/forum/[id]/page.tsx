"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { MinimalLoader, BackButton } from "../../../components/ui";

const CATEGORIES = [
  { key: "All", label: "All Discussions" },
  { key: "Cleanliness", label: "Waste & Cleanliness" },
  { key: "Drainage", label: "Water & Drainage" },
  { key: "Lighting", label: "Street Lighting" },
  { key: "Road Safety", label: "Roads & Traffic" },
  { key: "Parks & Greens", label: "Parks & Public Spaces" },
  { key: "Noise & Peace", label: "Noise & Public Safety" },
  { key: "General", label: "General Neighbor Chat" },
];

export default function ThreadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  // Left sidebar thread list state
  const [threads, setThreads] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarLoading, setSidebarLoading] = useState(true);

  // Load threads for the left sidebar
  useEffect(() => {
    let mounted = true;
    const fetchThreads = async () => {
      try {
        const res = await api.get("/forum", { fresh: true });
        if (mounted) {
          const list = Array.isArray(res.data) ? res.data : res.data?.threads || [];
          setThreads(list);
        }
      } catch {
        if (mounted) setThreads([]);
      } finally {
        if (mounted) setSidebarLoading(false);
      }
    };
    fetchThreads();
    return () => {
      mounted = false;
    };
  }, []);

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

  const filteredThreads = threads.filter((t) => {
    const matchesCat = activeCategory === "All" || t.category === activeCategory;
    const matchesQuery =
      !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f2] dark:bg-[#050907]">
        <MinimalLoader />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f0f4f2] dark:bg-[#050907]">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Thread Not Found</h2>
        <Link href="/forum" className="mt-4 text-teal-600 font-bold hover:underline text-sm">
          ← Back to Discussions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-76px)] w-full overflow-hidden bg-[#f0f4f2] dark:bg-[#050907]">
      {/* ── LEFT SIDEBAR (Desktop split view matching original Forum layout) ── */}
      <aside
        data-lenis-prevent="true"
        className="hidden lg:flex w-80 flex-shrink-0 flex-col bg-[#f9fbf9] dark:bg-[#0a120e] border-r border-[#dbe6df] dark:border-[#14241d] h-full z-20 select-none shadow-[6px_0_24px_rgba(0,0,0,0.03)]"
      >
        <div className="px-5 py-4 border-b border-[#e6eee9] dark:border-[#14241d] flex flex-col gap-3 bg-white dark:bg-[#0a120e]">
          <div className="flex items-center justify-between">
            <BackButton variant="dark" className="w-fit" />
            <Link
              href="/forum"
              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl text-emerald-600 cursor-pointer transition"
              title="All Threads"
            >
              <i className="ri-list-check text-base font-bold" />
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md shadow-emerald-500/10">
              C
            </div>
            <span className="text-slate-800 dark:text-white font-bold text-[13px] tracking-tight">
              Community Threads
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#e6eee9] dark:border-[#14241d]">
          <div className="relative w-full">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]" />
            <input
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-white dark:bg-[#0b1215] text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 transition shadow-sm font-semibold"
            />
          </div>
        </div>

        {/* Topics Scroller */}
        <div
          data-lenis-prevent="true"
          className="p-3.5 space-y-1 border-b border-[#e6eee9] dark:border-[#14241d] max-h-[220px] overflow-y-auto custom-scrollbar flex-shrink-0"
        >
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-2">
            Topics
          </p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === cat.key
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-l-4 border-l-emerald-600 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/45"
              }`}
            >
              <i className="ri-hashtag text-slate-400 mr-2 text-[13px] font-normal" />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Threads List Scroller */}
        <div
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto p-3.5 custom-scrollbar bg-transparent"
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2.5">
            Active Threads ({filteredThreads.length})
          </p>

          {sidebarLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 px-4 select-none">
              <p className="text-xs text-slate-400 font-semibold">No discussions in #{activeCategory}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((t) => {
                const isSelected = t._id === id;
                const initials = (t.posterName || "U")[0].toUpperCase();
                return (
                  <Link
                    key={t._id}
                    href={`/forum/${t._id}`}
                    className={`w-full p-3 rounded-xl text-left transition-all flex gap-2.5 border items-start cursor-pointer ${
                      isSelected
                        ? "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-md"
                        : "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border-slate-100 dark:border-[#1e3040] hover:bg-emerald-50/20 text-slate-700 dark:text-[#cbd5e1] shadow-sm"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border ${
                        isSelected
                          ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                          : "bg-slate-50 dark:bg-[#0b1215] border-slate-200 dark:border-[#1e3040] text-slate-500 dark:text-slate-300"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                          {t.title}
                        </p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1e3040] text-slate-500">
                          {t.replyCount || t.replies?.length || 0}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-1">{t.body}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-[#e6eee9] dark:border-[#14241d] bg-white dark:bg-[#0a120e]">
          <Link
            href="/forum"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <i className="ri-add-line text-[13px] font-bold" />
            <span>Start a Topic Thread</span>
          </Link>
        </div>
      </aside>

      {/* ── MAIN CHAT VIEWPORT ── */}
      <main
        data-lenis-prevent="true"
        className="flex-1 flex flex-col h-full bg-[#f0f4f2] dark:bg-[#050907] relative z-10 overflow-hidden"
      >
        {/* Sticky Thread Header */}
        <header className="px-5 py-3.5 border-b border-emerald-100 dark:border-[#14241d] flex items-center justify-between bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] flex-shrink-0 select-none shadow-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/forum"
              className="lg:hidden p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition text-emerald-700 hover:text-emerald-900 cursor-pointer"
              title="Back to All Threads"
            >
              <i className="ri-arrow-left-line text-base font-bold" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">#</span>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {thread.title}
                </h1>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                Topic: <span className="font-semibold text-emerald-600">#{thread.category || "General"}</span> · Started by {thread.posterName || "Neighbor"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUpvote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#14241d] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3040] transition cursor-pointer"
            >
              <i className="ri-thumb-up-line text-emerald-600" />
              <span>{thread.upvotes?.length || 0}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Conversation Stream */}
        <div
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4"
        >
          {/* Starter Message Box */}
          <div className="max-w-3xl mx-auto w-full bg-white dark:bg-[#0a120e] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#14241d] shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {(thread.posterName || "N")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {thread.posterName || "Neighbor"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {thread.createdAt ? new Date(thread.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-[#14241d]">
                #{thread.category || "General"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {thread.body}
            </p>
          </div>

          {/* Replies Section */}
          <div className="max-w-3xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Replies ({thread.replies?.length || 0})
              </span>
            </div>

            {(thread.replies || []).length === 0 ? (
              <div className="bg-white/60 dark:bg-[#0a120e]/60 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-[#14241d]">
                <p className="text-xs text-slate-400">No replies yet. Be the first neighbor to chime in!</p>
              </div>
            ) : (
              (thread.replies || []).map((rep: any, idx: number) => (
                <div
                  key={rep._id || idx}
                  className="bg-white dark:bg-[#0a120e] rounded-xl p-4 border border-slate-200/80 dark:border-[#14241d] shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#14241d] text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
                        {(rep.authorName || rep.senderName || "M")[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {rep.authorName || rep.senderName || "Member"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line pl-7">
                    {rep.body || rep.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pinned Reply Composer Form */}
        {!thread.isLocked ? (
          <form
            onSubmit={handleReply}
            className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#14241d] bg-white dark:bg-[#0a120e] flex gap-2 sm:gap-3 flex-shrink-0"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a helpful reply for your neighborhood..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-600 transition"
            />
            <button
              type="submit"
              disabled={posting}
              className="px-5 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition flex items-center gap-1.5"
            >
              <i className="ri-send-plane-fill text-xs" />
              <span>{posting ? "Posting..." : "Reply"}</span>
            </button>
          </form>
        ) : (
          <div className="p-3 border-t border-slate-200 dark:border-[#14241d] bg-amber-50 dark:bg-amber-950/20 text-center text-xs text-amber-700 font-semibold">
            This thread has been locked by administrators.
          </div>
        )}
      </main>
    </div>
  );
}
