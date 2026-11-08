"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BackButton } from "../../components/ui";

const CATEGORIES = [
  { key: "All", label: "All Topics" },
  { key: "General", label: "General" },
  { key: "Safety", label: "Safety" },
  { key: "Suggestions", label: "Suggestions" },
  { key: "Events", label: "Events" },
  { key: "Off-Topic", label: "Off-Topic" },
];

export default function ForumPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [creating, setCreating] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/forum", { params: { category: activeCategory, limit: 100 }, fresh: true });
      setThreads(res.data?.threads || []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const filteredThreads = threads.filter(
    (t) =>
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to start a discussion");
    if (!newTitle.trim() || !newBody.trim()) return toast.error("Please enter a title and message");
    setCreating(true);
    try {
      const res = await api.post("/forum", {
        title: newTitle,
        body: newBody,
        category: newCategory,
      });
      toast.success("Thread created!");
      setModalOpen(false);
      setNewTitle("");
      setNewBody("");
      if (res.data?.insertedId) {
        router.push(`/forum/${res.data.insertedId}`);
      } else {
        loadThreads();
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to create thread"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-76px)] w-full overflow-hidden bg-[#f0f4f2] dark:bg-[#050907]">
      <aside
        data-lenis-prevent="true"
        className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-[#f9fbf9] dark:bg-[#0a120e] border-r border-[#dbe6df] dark:border-[#14241d] h-full z-20 select-none shadow-[6px_0_24px_rgba(0,0,0,0.03)]"
      >
        <div className="px-5 py-4 border-b border-[#e6eee9] dark:border-[#14241d] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <BackButton variant="dark" className="w-fit" />
            <button
              onClick={() => setModalOpen(true)}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl text-emerald-600 cursor-pointer"
              title="Start a Topic Thread"
            >
              <i className="ri-add-line text-lg font-black"></i>
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-xs font-black">
              C
            </div>
            <span className="text-slate-800 dark:text-white font-bold text-[13px]">Community Threads</span>
          </div>
        </div>

        <div className="p-4 border-b border-[#e6eee9] dark:border-[#14241d]">
          <div className="relative w-full">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
            <input
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-white dark:bg-[#0b1215] text-xs text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div data-lenis-prevent="true" className="p-3.5 space-y-1 border-b border-[#e6eee9] dark:border-[#14241d] max-h-[220px] overflow-y-auto custom-scrollbar flex-shrink-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-2">Topics</p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === cat.key
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-l-4 border-l-emerald-600"
                  : "text-slate-600 dark:text-slate-300 hover:bg-emerald-50/40"
              }`}
            >
              <i className="ri-hashtag text-slate-400 mr-2"></i>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div data-lenis-prevent="true" className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2.5">
            Active Threads ({filteredThreads.length})
          </p>
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading threads...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">No discussions in #{activeCategory}</div>
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((t) => (
                <Link
                  key={t._id}
                  href={`/forum/${t._id}`}
                  className="w-full p-3 rounded-xl text-left transition-all flex gap-2.5 border bg-white dark:bg-[#0b1215] border-slate-100 dark:border-[#1e3040] hover:border-emerald-300 items-start"
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                    {(t.posterName || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{t.title}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1e3040] text-slate-500">
                        {t.replyCount || t.replies?.length || 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-1">{t.body}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5 border-t border-[#e6eee9] dark:border-[#14241d]">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ri-add-line"></i> Start a Topic Thread
          </button>
        </div>
      </aside>

      <main className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-white dark:bg-[#0a120e] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100 dark:border-[#14241d]">
          <i className="ri-chat-3-line text-3xl text-emerald-600"></i>
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Welcome to CivicNest Discussions</h2>
        <p className="text-slate-500 dark:text-slate-300 max-w-xs text-xs leading-relaxed mb-6">
          Pick a topic thread from the sidebar to join active neighbourhood conversations, or start a new thread to raise a concern.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs cursor-pointer"
        >
          + Start a New Thread
        </button>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={handleCreateThread}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 max-w-lg w-full border border-slate-200 dark:border-[#1e3040] space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar"
            data-lenis-prevent="true"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Start a Topic Thread</h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Topic Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] text-sm"
              >
                {CATEGORIES.filter((c) => c.key !== "All").map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Thread Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What would you like to discuss?"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Message *</label>
              <textarea
                required
                rows={4}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Share details with your neighbors..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">
                {creating ? "Posting..." : "Post Thread"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

