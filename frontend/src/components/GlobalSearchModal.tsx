"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../lib/api";

type Result = { _id: string; title: string; type: string; link: string };

// Result types whose detail pages exist in this milestone.
const OPENABLE = ["Issue"];

const ICONS: Record<string, string> = {
  Issue: "ri-alert-line text-amber-500",
  Event: "ri-calendar-event-line text-emerald-500",
  Notice: "ri-notification-3-line text-indigo-500",
  "Lost & Found": "ri-search-eye-line text-blue-500",
  "Animal Rescue": "ri-heart-line text-rose-500",
  NGO: "ri-shield-user-line text-teal-500",
  "Forum Thread": "ri-chat-3-line text-purple-500",
};

export default function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    setQuery("");
    setResults([]);
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get("/public/search", { params: { q: query.trim() } });
        if (!cancelled && res.data?.success) setResults(res.data.results);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const open = (r: Result) => {
    router.push(r.link);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#0a120e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1e3040] overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-[#1e3040]">
              <i className="ri-search-line text-xl text-slate-400"></i>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search issues, events, notices..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none px-4 text-[15px] text-slate-800 dark:text-white placeholder-slate-400 font-medium h-10"
              />
              {query && (
                <button onClick={() => setQuery("")} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#1e3040] text-slate-400 cursor-pointer" aria-label="Clear">
                  <i className="ri-close-line text-xl"></i>
                </button>
              )}
              <div className="h-6 w-px bg-slate-200 dark:bg-[#1e3040] mx-2"></div>
              <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded cursor-pointer">
                ESC
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isSearching ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                  <i className="ri-loader-4-line text-2xl animate-spin text-[#0f766e]"></i>
                  <span className="text-sm font-medium">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {results.map((r) => (
                    <button key={`${r.type}-${r._id}`} onClick={() => open(r)} className="flex items-center justify-between w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0b1215] transition-colors group cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1e3040] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0f766e]/10">
                          <i className={`${ICONS[r.type] || "ri-search-line text-slate-500"} text-sm`}></i>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[13px] font-bold text-slate-800 dark:text-white truncate">{r.title}</span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">{r.type}</span>
                        </div>
                      </div>
                      <i className="ri-arrow-right-line text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1"></i>
                    </button>
                  ))}
                </div>
              ) : query.trim().length >= 2 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                  <i className="ri-ghost-line text-3xl opacity-50"></i>
                  <span className="text-[13px] font-medium">No results found for &quot;{query}&quot;</span>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                  <i className="ri-search-eye-line text-3xl opacity-50"></i>
                  <span className="text-[13px] font-medium">Type at least 2 characters to search</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
