"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "../../lib/api";

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  notice: { icon: "ri-notification-3-line", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  alert: { icon: "ri-alarm-warning-line", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" },
  event: { icon: "ri-calendar-event-line", color: "text-teal-500", bg: "bg-teal-500/10 border-teal-500/20" },
  maintenance: { icon: "ri-tools-line", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  policy: { icon: "ri-government-line", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
};

const urgencyBadge: Record<string, string> = {
  normal: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  important: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  urgent: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse",
};

export default function NoticeboardPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("");

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterUrgency]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterUrgency) params.urgency = filterUrgency;
      const res = await api.get("/announcements", { params });
      setAnnouncements(res.data || []);
    } catch {
      console.error("Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f4] dark:bg-[#050907] py-12 px-4 sm:px-6 transition-colors">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-3">
            <i className="ri-megaphone-line"></i> Official Updates
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Community Noticeboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto text-sm">
            Stay informed about official announcements, maintenance schedules, emergency alerts, and upcoming community initiatives.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 bg-white dark:bg-[#0a120e] p-4 rounded-2xl border border-slate-200/80 dark:border-[#14241d] shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {["", "notice", "alert", "event", "maintenance", "policy"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filterType === t
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-[#111f18] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162920]"
                }`}
              >
                {t || "All Types"}
              </button>
            ))}
          </div>

          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#111f18] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1c3026] focus:outline-none"
          >
            <option value="">All Urgency</option>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white dark:bg-[#0a120e] animate-pulse border border-slate-200/60 dark:border-[#14241d]" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#0a120e] rounded-2xl border border-slate-200/60 dark:border-[#14241d]">
            <i className="ri-temp-cold-line text-5xl text-slate-300 dark:text-slate-700 mb-3 block"></i>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Announcements Found</h3>
            <p className="text-slate-500 text-sm mt-1">There are no active notices matching your filters right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => {
              const cfg = typeConfig[item.type] || typeConfig.notice;
              const isPinned = item.isPinned || item.pinned;
              return (
                <Link
                  key={item._id}
                  href={`/noticeboard/${item._id}`}
                  className={`block bg-white dark:bg-[#0a120e] rounded-2xl p-6 border transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    isPinned
                      ? "border-teal-500/50 dark:border-teal-500/40 ring-1 ring-teal-500/20"
                      : "border-slate-200/80 dark:border-[#14241d]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isPinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500 text-white">
                          <i className="ri-pushpin-2-fill"></i> Pinned
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${cfg.bg} ${cfg.color}`}>
                        <i className={cfg.icon}></i> {item.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${urgencyBadge[item.urgency] || urgencyBadge[item.priority] || urgencyBadge.normal}`}>
                        {item.urgency || item.priority || "normal"}
                      </span>
                      {(item.targetArea || item.affectedArea) && (item.targetArea || item.affectedArea) !== "All Areas" && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <i className="ri-map-pin-line"></i> {item.targetArea || item.affectedArea}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt || item.date || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-500">
                    {item.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description || item.content}</p>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-[#14241d] text-xs text-slate-400">
                    <span>Posted by {item.posterName || item.createdBy?.name || item.postedBy || "Admin"}</span>
                    <span className="flex items-center gap-3">
                      <span><i className="ri-eye-line mr-1"></i>{item.views || 0} views</span>
                      <span className="text-teal-600 dark:text-teal-400 font-semibold">Read full notice →</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

