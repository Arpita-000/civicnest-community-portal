"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, Calendar, CheckCircle2, Clock, Layers, Leaf, MessageSquare, Plus, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../components/ui";
import PollCard from "../../components/polls/PollCard";
import CreatePollModal from "../../components/polls/CreatePollModal";

type Chip = { label: string; value: string | null; icon: React.ReactNode };

const CATEGORY_CHIPS: Chip[] = [
  { label: "All Topics", value: null, icon: <Layers className="w-3.5 h-3.5" /> },
  { label: "Community", value: "community", icon: <Users className="w-3.5 h-3.5" /> },
  { label: "Environment", value: "environment", icon: <Leaf className="w-3.5 h-3.5" /> },
  { label: "Events", value: "events", icon: <Calendar className="w-3.5 h-3.5" /> },
  { label: "Infrastructure", value: "infrastructure", icon: <Building2 className="w-3.5 h-3.5" /> },
  { label: "General", value: "general", icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

function FilterChips({ chips, value, onChange, id }: { chips: Chip[]; value: string | null; onChange: (v: string | null) => void; id: string }) {
  return (
    <div className="flex flex-wrap gap-2 relative">
      {chips.map((chip) => {
        const active = value === chip.value;
        return (
          <button
            key={chip.value ?? "all"}
            onClick={() => onChange(chip.value)}
            aria-pressed={active}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-300 cursor-pointer shadow-sm select-none z-10 ${
              active ? "text-white border-transparent" : "bg-emerald-50/50 dark:bg-[#0f1a14] border-emerald-100 dark:border-[#14241d] text-emerald-800/85 dark:text-emerald-200/80 hover:border-[var(--g-200)] hover:bg-emerald-100/40 dark:hover:bg-[#14241d] hover:text-emerald-950 dark:hover:text-emerald-100"
            }`}
          >
            {active && <motion.div layoutId={`chip-${id}`} className="absolute inset-0 bg-[var(--g-600)] rounded-full shadow-md shadow-emerald-500/10 -z-10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="relative z-20 flex items-center gap-1.5">
              {chip.icon && <span className="flex items-center justify-center text-[13px] flex-shrink-0">{chip.icon}</span>}
              <span>{chip.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function PollsPage() {
  const { user, role } = useAuth();
  const [polls, setPolls] = useState<any[]>([]);
  const [stats, setStats] = useState<{ active: number; total: number; totalVotes: number } | null>(null);
  const [status, setStatus] = useState<string | null>("active");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const reqId = useRef(0);

  const statusChips: Chip[] = [
    { label: "Active", value: "active", icon: <Clock className="w-3.5 h-3.5" /> },
    { label: "Ended", value: "ended", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    ...(role === "admin" ? [{ label: "Pending Approval", value: "pending", icon: <Layers className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> }] : []),
    { label: "All Statuses", value: null, icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (fresh = false) => {
      const id = ++reqId.current;
      setError(false);
      try {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        if (category) params.category = category;
        if (debounced) params.search = debounced;
        const [list, s] = await Promise.all([api.get("/polls", { params, fresh }), api.get("/polls/stats", { fresh })]);
        if (id !== reqId.current) return;
        setPolls(list.data);
        setStats(s.data);
      } catch {
        if (id !== reqId.current) return;
        setError(true);
        toast.error("Failed to load community polls.", { id: "polls-load" });
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [status, category, debounced, user?.uid]
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // keep numbers live without hammering the API
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const openCreate = () => {
    if (!user) return toast.error("Please log in to create a poll");
    setCreateOpen(true);
  };

  const statCards = [
    { value: stats?.active ?? 0, label: "Active Polls" },
    { value: stats?.totalVotes ?? 0, label: "Total Votes" },
    { value: stats?.total ?? 0, label: "Total Polls" },
  ];

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#030806]">
      {/* Banner */}
      <div className="relative pt-14 pb-12 px-[5%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-4 text-emerald-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[13px] font-bold uppercase tracking-wider">Community Polls</span>
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">Voice Your Opinion</h1>
              <p className="font-body text-white/80 text-[13px] max-w-2xl">Participate in community polls to help shape decisions. Every vote matters.</p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-emerald-50 text-teal-700 font-bold rounded-lg shadow-xl hover:shadow-2xl hover:shadow-white/20 transition-all transform hover:scale-105 cursor-pointer">
                <Plus className="w-5 h-5" />
                <span>Create Poll</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap mt-6">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 flex flex-col gap-1 min-w-[140px] backdrop-blur-md shadow-lg shadow-black/10 hover:bg-white/15 transition-all duration-300 select-none">
                <p className="text-3xl tracking-tight font-extrabold text-white tabular-nums font-display">{stats ? s.value : "–"}</p>
                <p className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider leading-none">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-[5%] py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 space-y-4">
            <div className="relative flex items-center">
              <Search className="absolute left-5 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search polls..."
                aria-label="Search polls"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[var(--g-300)] focus:ring-1 focus:ring-[var(--g-300)]/50 transition-all"
              />
            </div>

            <div className="flex flex-col gap-4 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d]/40 backdrop-blur-sm p-4 rounded-lg border border-[#e6eee9] dark:border-[#14241d] select-none shadow-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[70px]">Status</span>
                <FilterChips id="status" chips={statusChips} value={status} onChange={setStatus} />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[70px]">Category</span>
                <FilterChips id="category" chips={CATEGORY_CHIPS} value={category} onChange={setCategory} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <MinimalLoader />
            </div>
          ) : error && polls.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-xl border border-rose-200 dark:border-rose-900/50 max-w-2xl mx-auto shadow-sm">
              <i className="ri-wifi-off-line text-4xl text-rose-400"></i>
              <h3 className="text-[13px] font-bold text-slate-900 dark:text-white mt-2">Couldn&apos;t load polls</h3>
              <button onClick={() => load(true)} className="mt-4 px-6 py-2.5 bg-[var(--g-600)] hover:bg-[var(--g-700)] text-white font-bold rounded-xl cursor-pointer">
                Try again
              </button>
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl border border-slate-200 dark:border-[#1e3040] max-w-2xl mx-auto shadow-sm select-none">
              <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-[13px] font-bold text-slate-900 dark:text-white mb-2">No polls found</h3>
              <p className="text-slate-500 dark:text-slate-300 max-w-sm mx-auto text-[13px] font-medium mb-6 leading-relaxed">Try a different filter, or be the first to create a community poll.</p>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--g-600)] hover:bg-[var(--g-700)] text-white font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-95">
                <Plus className="w-4 h-4" />
                <span>Create First Poll</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {polls.map((poll, i) => (
                <motion.div key={poll._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
                  <PollCard poll={poll} onChanged={() => load(true)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreatePollModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => load(true)} />
    </div>
  );
}
