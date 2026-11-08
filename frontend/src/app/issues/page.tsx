"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import api from "../../lib/api";
import SocialFeedCard from "../../components/SocialFeedCard";
import { BackButton, MinimalLoader, PremiumDropdown } from "../../components/ui";
import { comingSoon } from "../../components/soon";

const SECTORS = [
  { label: "Garbage & Waste", image: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=500&q=80" },
  { label: "Road Damage", image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=500&q=80" },
  { label: "Waterlogging", image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=500&q=80" },
  { label: "Utility Problems", image: "https://images.unsplash.com/photo-1521618755572-156ae0cdd74d?auto=format&fit=crop&w=500&q=80" },
  { label: "Broken Public Property", image: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=500&q=80" },
  { label: "Safety & Crime", image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=500&q=80" },
  { label: "Environmental Issues", image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=500&q=80" },
];

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Most Upvoted", value: "most_upvoted" },
  { label: "Highest Funded", value: "most_funded" },
];

const PAGE_SIZE = 10;

// Some stock photos disappear over time; fall back to a generated illustration instead of a broken icon.
const tileFallback = (label: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
  const fallback = `/demo/issue-${label.toLowerCase().replace(/[^a-z]+/g, "-")}.svg`;
  if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback;
};

export default function AllIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMore, setIsMore] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [meta, setMeta] = useState<{ total: number; byCategory: Record<string, number>; areas: string[] }>({ total: 0, byCategory: {}, areas: [] });
  const reqId = useRef(0);

  useEffect(() => {
    api.get("/issues/stats").then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    page === 1 ? setIsLoading(true) : setIsMore(true);
    setError("");
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (debounced) params.search = debounced;
      if (category) params.category = category;
      if (area) params.area = area;
      if (sort !== "newest") params.sort = sort;
      const { data } = await api.get("/issues", { params });
      if (id !== reqId.current) return; // a newer request superseded this one
      setIssues((prev) => (page === 1 ? data.issues : [...prev, ...data.issues]));
      setTotalPages(data.totalPages || 1);
    } catch {
      if (id !== reqId.current) return;
      if (page === 1) setIssues([]);
      setTotalPages(1);
      setError("We couldn't load the incident reports. Please check your connection and try again.");
    } finally {
      if (id === reqId.current) {
        setIsLoading(false);
        setIsMore(false);
      }
    }
  }, [debounced, category, area, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const resetTo = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const areaOptions = [{ label: "All Areas", value: "" }, ...meta.areas.map((a) => ({ label: a, value: a }))];

  return (
    <div className="min-h-screen py-8 font-body">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <BackButton variant="dark" className="mb-4 inline-flex" />
        <h1 className="text-3xl tracking-tight font-extrabold text-slate-900 dark:text-white">Active Incident Reports</h1>
        <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1">
          Monitor, track, and mobilize resources for local{" "}
          <span className="text-[#0f766e] font-bold">
            <Typewriter words={["infrastructure hazards.", "drainage failures.", "utility outages.", "sanitation breaches."]} loop={0} cursor cursorStyle="|" typeSpeed={70} deleteSpeed={50} delaySpeed={1500} />
          </span>
        </p>
      </div>

      {/* CivicBot banner */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-teal-50/70 to-emerald-50/70 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-900 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg border border-teal-100 dark:border-teal-900 flex items-center justify-center text-teal-600">
              <i className="ri-robot-line text-[13px]"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">✨ CivicBot AI Helper Available</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-semibold">
                Draft detailed incident reports, generate city corporate complaint letters, and get animal rescue tips instantly.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => comingSoon("CivicBot AI")} className="px-4 py-2 bg-[#0f766e] hover:bg-[#0d645d] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer">
            Open CivicBot AI
          </button>
        </div>
      </div>

      {/* Sector tiles */}
      <div className="max-w-5xl mx-auto px-4 mb-8">
        <h2 className="text-[13px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-4 px-1">Filter Incidents by Infrastructure Sector</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          <button
            onClick={() => resetTo(() => setCategory(""))}
            aria-pressed={category === ""}
            className={`relative flex flex-col items-start justify-end w-full aspect-[4/3] rounded-md p-3 overflow-hidden transition-all duration-300 group cursor-pointer ${category === "" ? "ring-2 ring-slate-800 dark:ring-emerald-500 ring-offset-2 ring-offset-[var(--bg-page)]" : "hover:opacity-95"}`}
          >
            <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=500&q=80" alt="All Reports" onError={tileFallback("all-reports")} className="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/20"></div>
            <i className="ri-list-check-2 text-2xl tracking-tight text-white/80 mb-auto relative z-10"></i>
            <div className="relative z-10">
              <span className="block text-[13px] font-bold text-white text-left">All Active Reports</span>
              <span className="block text-xs text-slate-300 mt-0.5 text-left">{meta.total} Total</span>
            </div>
          </button>

          {SECTORS.map((c) => (
            <button
              key={c.label}
              onClick={() => resetTo(() => setCategory(c.label))}
              aria-pressed={category === c.label}
              className={`relative w-full aspect-[4/3] rounded-md overflow-hidden transition-all duration-300 group cursor-pointer ${category === c.label ? "ring-2 ring-slate-800 dark:ring-emerald-500 ring-offset-2 ring-offset-[var(--bg-page)]" : "hover:opacity-95"}`}
            >
              <img src={c.image} alt={c.label} loading="lazy" onError={tileFallback(c.label)} className="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 text-left">
                <span className="block text-[13px] font-bold text-white leading-tight mb-0.5">{c.label}</span>
                <span className="block text-xs text-slate-300">{meta.byCategory[c.label] || 0} Reports</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040] p-3 mb-6 flex gap-3 items-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1e3040] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <i className="ri-user-smile-line text-[13px] tracking-tight text-slate-400"></i>
          </div>
          <button onClick={() => router.push("/issues/add")} className="flex-grow bg-slate-50 dark:bg-[#0b1215] hover:bg-slate-100 dark:hover:bg-[#1e3040] transition-colors rounded-md h-10 px-4 text-left text-slate-500 dark:text-slate-300 font-medium border border-slate-200 dark:border-[#1e3040] cursor-pointer">
            Create Post...
          </button>
          <button aria-label="Add photo" onClick={() => router.push("/issues/add")} className="w-10 h-10 rounded-md hover:bg-slate-100 dark:hover:bg-[#1e3040] text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer">
            <i className="ri-image-add-line text-[13px] tracking-tight"></i>
          </button>
          <button aria-label="Add link" onClick={() => router.push("/issues/add")} className="w-10 h-10 rounded-md hover:bg-slate-100 dark:hover:bg-[#1e3040] text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer">
            <i className="ri-link text-[13px] tracking-tight"></i>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
          <div className="relative w-full sm:w-auto flex-grow max-w-sm">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search incidents"
              value={search}
              onChange={(e) => resetTo(() => setSearch(e.target.value))}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e] transition-all text-[13px] font-medium text-slate-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <PremiumDropdown options={areaOptions} value={area} onChange={(v) => resetTo(() => setArea(v))} placeholder="Area" icon="ri-map-pin-line" className="flex-1 sm:flex-none sm:w-40" />
            <PremiumDropdown options={SORT_OPTIONS} value={sort} onChange={(v) => resetTo(() => setSort(v))} placeholder="Sort" icon="ri-filter-3-line" className="flex-1 sm:flex-none sm:w-44" />
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <MinimalLoader />
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white dark:bg-[#0a120e] rounded-xl border border-rose-200 dark:border-rose-900/50">
              <i className="ri-wifi-off-line text-3xl text-rose-400"></i>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2 max-w-xs mx-auto">{error}</p>
              <button onClick={load} className="mt-4 px-6 py-2 text-[13px] font-bold text-white bg-[#0f766e] hover:bg-[#0d645d] rounded-full transition-colors cursor-pointer">
                Try again
              </button>
            </div>
          ) : issues.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl border border-slate-200 dark:border-[#1e3040] border-dashed">
              <div className="w-20 h-20 bg-slate-50 dark:bg-[#0b1215] rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-cactus-line text-4xl tracking-tight text-slate-400"></i>
              </div>
              <h3 className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] tracking-tight">Wow, such empty</h3>
              <p className="text-slate-500 dark:text-slate-300 text-[13px] mt-1">No issues match your current filters.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setDebounced("");
                  setCategory("");
                  setArea("");
                  setPage(1);
                }}
                className="mt-4 px-6 py-2 text-[13px] font-bold text-[#40826D] bg-slate-100 dark:bg-[#1e3040] hover:bg-slate-200 dark:hover:bg-[#284257] rounded-full transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {issues.map((issue) => (
                <SocialFeedCard key={`${issue._type}-${issue._id}`} issue={issue} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {!isLoading && !error && page < totalPages && (
          <div className="flex justify-center mt-8 mb-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isMore}
              className="relative overflow-hidden text-[13px] font-bold text-slate-500 dark:text-slate-300 hover:text-[#40826D] transition-colors flex items-center gap-1 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] hover:bg-slate-50 dark:hover:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] px-5 py-2.5 rounded-full shadow-sm cursor-pointer disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isMore ? "Loading..." : "Load More Posts"}
                <i className={`ri-refresh-line ${isMore ? "animate-spin" : ""}`}></i>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
