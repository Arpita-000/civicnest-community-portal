"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const BADGE_INFO: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  first_report: { label: "First Steps", icon: "ri-footprint-line", color: "text-sky-500 bg-sky-50 dark:bg-sky-900/20", desc: "Submitted first issue report" },
  reporter_5: { label: "Watchful Eye", icon: "ri-eye-line", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", desc: "Reported 5+ civic issues" },
  reporter_25: { label: "Civic Sentinel", icon: "ri-shield-star-line", color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20", desc: "Reported 25+ civic issues" },
  first_fix: { label: "Problem Solver", icon: "ri-tools-line", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", desc: "Resolved first community issue" },
  fixer_10: { label: "Master Fixer", icon: "ri-hammer-line", color: "text-teal-500 bg-teal-50 dark:bg-teal-900/20", desc: "Resolved 10+ issues" },
  verifier_5: { label: "Truth Seeker", icon: "ri-checkbox-circle-line", color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20", desc: "Verified 5+ community fixes" },
  donor: { label: "Community Patron", icon: "ri-hand-heart-line", color: "text-rose-500 bg-rose-50 dark:bg-rose-900/20", desc: "Donated to a civic cause" },
  streak_7: { label: "7-Day Streak", icon: "ri-fire-line", color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20", desc: "Active 7 days in a row" },
  streak_30: { label: "Unstoppable", icon: "ri-flashlight-line", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20", desc: "Active 30 days in a row" },
  century: { label: "Centurion", icon: "ri-medal-line", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20", desc: "Earned 100+ civic points" },
  legend: { label: "Civic Legend", icon: "ri-vip-crown-line", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20", desc: "Earned 500+ civic points" },
};

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get("/users/leaderboard")
      .then((res) => setLeaders(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const topThree = leaders.slice(0, 3);
  const myRank = user ? leaders.findIndex((l) => l.email === user.email) + 1 : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#050907] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
            <i className="ri-trophy-fill" /> Hall of Fame
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Civic Impact <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-teal-500">Leaderboard</span>
          </h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Recognizing the citizens and volunteers who actively report, resolve, and verify community issues every day.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { action: "Report an Issue", pts: "+10 pts", icon: "ri-megaphone-line", color: "text-sky-500" },
            { action: "Claim an Issue", pts: "+5 pts", icon: "ri-hand-coin-line", color: "text-amber-500" },
            { action: "Submit Fix Proof", pts: "+30 pts", icon: "ri-camera-lens-line", color: "text-emerald-500" },
            { action: "Verify a Fix", pts: "+15 pts", icon: "ri-shield-check-line", color: "text-purple-500" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#0a120e] border border-slate-200/70 dark:border-[#14241d] rounded-2xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#111f18] flex items-center justify-center text-xl ${item.color}`}>
                <i className={item.icon} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.action}</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-white">{item.pts}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-teal-500" />
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0a120e] rounded-3xl border border-slate-200 dark:border-[#14241d]">
            <p className="text-slate-500">No points recorded yet. Be the first to make an impact!</p>
          </div>
        ) : (
          <>
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 items-end">
                {[topThree[1], topThree[0], topThree[2]].map((leader, idx) => {
                  if (!leader) return <div key={idx} className="hidden md:block" />;
                  const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                  const isFirst = actualRank === 1;
                  const crownColors: Record<number, string> = {
                    1: "from-amber-400 to-yellow-600 ring-amber-400/40",
                    2: "from-slate-300 to-slate-500 ring-slate-400/30",
                    3: "from-amber-700 to-orange-800 ring-amber-700/30",
                  };

                  return (
                    <motion.div
                      key={leader._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative bg-white dark:bg-[#0a120e] rounded-3xl p-6 border ${
                        isFirst
                          ? "border-amber-400/50 dark:border-amber-500/30 md:-translate-y-4 shadow-xl shadow-amber-500/5"
                          : "border-slate-200 dark:border-[#14241d] shadow-md"
                      } flex flex-col items-center text-center`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${crownColors[actualRank]} text-white font-black text-sm flex items-center justify-center shadow-md mb-3`}
                      >
                        #{actualRank}
                      </div>
                      <div className={`relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr ${crownColors[actualRank]} ring-4 mb-3`}>
                        {leader.photoURL ? (
                          <img src={leader.photoURL} alt={leader.name} className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-100 dark:bg-[#14241d] flex items-center justify-center text-2xl font-bold text-teal-600">
                            {leader.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/user/${leader.uid || leader._id}`}
                        className="font-bold text-lg text-slate-900 dark:text-white hover:text-teal-500 transition line-clamp-1"
                      >
                        {leader.name || "Community Citizen"}
                      </Link>
                      <span className="text-xs text-slate-400 mb-3">{leader.area || "Active Member"}</span>

                      <div className="px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-base mb-4">
                        {leader.points || 0} pts
                      </div>

                      <div className="flex flex-wrap justify-center gap-1.5">
                        {(leader.badges || []).slice(0, 4).map((b: string) => {
                          const info = BADGE_INFO[b];
                          if (!info) return null;
                          return (
                            <span
                              key={b}
                              title={`${info.label}: ${info.desc}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${info.color}`}
                            >
                              <i className={info.icon} /> {info.label}
                            </span>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {myRank > 0 && (
              <div className="mb-6 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white/20 font-black flex items-center justify-center">#{myRank}</span>
                  <div>
                    <p className="text-xs text-teal-100">Your Current Standing</p>
                    <p className="font-bold text-sm">Keep contributing to climb the Civic Leaderboard!</p>
                  </div>
                </div>
                <span className="font-black text-lg">{leaders[myRank - 1]?.points || 0} pts</span>
              </div>
            )}

            <div className="bg-white dark:bg-[#0a120e] rounded-3xl border border-slate-200 dark:border-[#14241d] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-[#14241d] flex items-center justify-between">
                <h2 className="font-bold text-slate-800 dark:text-white">Top Contributors</h2>
                <span className="text-xs text-slate-400">Updated live</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-[#14241d]">
                {leaders.map((leader, idx) => (
                  <div
                    key={leader._id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-[#0f1a14] transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`w-7 text-center font-black text-sm ${
                          idx < 3 ? "text-amber-500" : "text-slate-400"
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-[#14241d] flex-shrink-0 flex items-center justify-center font-bold text-teal-600">
                        {leader.photoURL ? (
                          <img src={leader.photoURL} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          leader.name?.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/user/${leader.uid || leader._id}`}
                            className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-teal-500 truncate"
                          >
                            {leader.name || "Community Citizen"}
                          </Link>
                          {leader.streak?.current > 1 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded"
                              title="Active day streak"
                            >
                              <i className="ri-fire-fill" /> {leader.streak.current}d
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(leader.badges || []).slice(0, 3).map((b: string) => {
                            const info = BADGE_INFO[b];
                            if (!info) return null;
                            return (
                              <span
                                key={b}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${info.color}`}
                              >
                                <i className={info.icon} /> {info.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="font-extrabold text-sm text-teal-600 dark:text-teal-400">{leader.points || 0}</span>
                      <span className="text-xs text-slate-400 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

