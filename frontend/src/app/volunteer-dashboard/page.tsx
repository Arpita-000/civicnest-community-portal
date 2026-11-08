"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api, { errMsg } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../components/ui";

export default function VolunteerDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<any>({});
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});

  const loadDashboard = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statsRes, evRes] = await Promise.all([
        api.get("/volunteers/stats", { fresh: true }).catch(() => ({ data: {} })),
        api.get("/cleanup-events/my", { fresh: true }).catch(() => ({ data: { attending: [] } })),
      ]);
      setStats(statsRes.data || {});
      setMyEvents(evRes.data?.attending || []);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCheckIn = async (eventId: string) => {
    const code = otpInputs[eventId] || "";
    if (code.length !== 6) return toast.error("Enter the 6-digit code from the organizer.");
    try {
      const res = await api.post(`/cleanup-events/${eventId}/checkin`, { otp: code });
      toast.success(res.data?.message || "Checked in!");
      loadDashboard();
    } catch (err) {
      toast.error(errMsg(err, "Check-in failed"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-[5%] flex items-center justify-center">
        <MinimalLoader />
      </div>
    );
  }

  const history = stats.history || [];
  const dynamicAchievements = [
    { id: "official_volunteer", title: "Community Volunteer", description: "Approved volunteer force member", points: 0, icon: "ri-heart-3-fill", unlocked: true },
    { id: "first_event", title: "First Step", description: "Complete your first event", points: 50, icon: "ri-flag-line", unlocked: (stats.totalEvents || 0) >= 1 },
    { id: "five_events", title: "Dedicated", description: "Complete 5 events", points: 100, icon: "ri-medal-line", unlocked: (stats.totalEvents || 0) >= 5 },
    { id: "ten_events", title: "Champion", description: "Complete 10 events", points: 200, icon: "ri-trophy-line", unlocked: (stats.totalEvents || 0) >= 10 },
    { id: "twenty_events", title: "Legend", description: "Complete 20 events", points: 500, icon: "ri-vip-crown-line", unlocked: (stats.totalEvents || 0) >= 20 },
  ];

  return (
    <div className="min-h-screen">
      <div className="relative pt-16 pb-12 px-[5%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-4 text-emerald-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[13px] font-bold uppercase tracking-wider">Volunteer Portal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">My Volunteer Journey</h1>
              <p className="text-white/80 text-[13px] max-w-2xl">
                Track your contributions, verify your participation, and earn points for making a difference.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Total Points</p>
                <p className="text-3xl font-bold text-white">{stats.totalPoints || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Level</p>
                <p className="text-3xl font-bold text-white">{stats.currentLevel || "Bronze"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Hours", val: `${stats.totalHours || 0}h`, icon: "ri-time-line", color: "bg-teal-100 text-teal-600" },
              { label: "Events Completed", val: stats.totalEvents || 0, icon: "ri-calendar-check-line", color: "bg-emerald-100 text-emerald-600" },
              { label: "Total Points", val: stats.totalPoints || 0, icon: "ri-star-line", color: "bg-amber-100 text-amber-600" },
              { label: "Pending Verifications", val: stats.pendingVerifications || 0, icon: "ri-history-line", color: "bg-purple-100 text-purple-600" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-[#0a120e] rounded-lg p-4 border border-slate-200 dark:border-[#1e3040] shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                    <i className={item.icon}></i>
                  </div>
                  <p className="text-slate-500 dark:text-slate-300 text-[13px]">{item.label}</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{item.val}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-[#1e3040]">
            {["overview", "history", "achievements"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-6 py-3 font-semibold capitalize transition-all relative cursor-pointer ${
                  activeTab === t ? "text-teal-600 border-b-2 border-teal-600" : "text-slate-500 dark:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-6">
                    {myEvents.length > 0 && (
                      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 rounded-lg p-5 shadow-sm">
                        <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-4 flex items-center gap-2">
                          <i className="ri-calendar-check-line"></i> Active Events — Check In
                        </h3>
                        <div className="space-y-3">
                          {myEvents.map((ev) => (
                            <div
                              key={ev._id}
                              className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] rounded-xl justify-between"
                            >
                              <div className="w-full text-left">
                                <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{ev.title}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(ev.eventDate).toLocaleDateString()} at {ev.eventTime}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  value={otpInputs[ev._id] || ""}
                                  onChange={(e) =>
                                    setOtpInputs({ ...otpInputs, [ev._id]: e.target.value.replace(/\D/g, "").slice(0, 6) })
                                  }
                                  placeholder="6-digit code"
                                  className="w-28 px-3 py-2 text-[13px] border border-slate-200 dark:border-[#1e3040] rounded-xl text-center font-mono"
                                />
                                <button
                                  onClick={() => handleCheckIn(ev._id)}
                                  className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl whitespace-nowrap"
                                >
                                  Check In
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-teal-700 to-emerald-800 text-white rounded-lg p-6 shadow-sm">
                      <h3 className="font-black text-lg mb-4">Progress to {stats.nextLevel || "Silver"}</h3>
                      <div className="flex justify-between text-[13px] mb-2 font-semibold">
                        <span>Current: {stats.currentLevel || "Bronze"}</span>
                        <span>{stats.pointsToNextLevel ?? 100} points to {stats.nextLevel || "Silver"}</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden bg-white/20 mb-4">
                        <div
                          className="h-full bg-white rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, ((stats.totalPoints || 0) / Math.max(1, (stats.totalPoints || 0) + (stats.pointsToNextLevel || 100))) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-white/80">Keep participating in events to level up and unlock exclusive benefits!</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0a120e] rounded-lg p-4 border border-slate-200 dark:border-[#1e3040] shadow-sm">
                      <h3 className="font-bold text-slate-800 dark:text-white mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <Link
                          href="/volunteers"
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 transition-colors"
                        >
                          <i className="ri-add-circle-line text-teal-600"></i>
                          <span className="font-semibold text-teal-700 dark:text-teal-300">Find Events</span>
                        </Link>
                        <Link
                          href="/issues/verify"
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-colors"
                        >
                          <i className="ri-shield-check-line text-emerald-600"></i>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">Verify Community Fixes</span>
                        </Link>
                        <Link
                          href="/leaderboard"
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-colors"
                        >
                          <i className="ri-leaderboard-line text-amber-600"></i>
                          <span className="font-semibold text-amber-700 dark:text-amber-300">Leaderboard</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white dark:bg-[#0a120e] rounded-lg border border-slate-200 dark:border-[#1e3040] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-[#1e3040]">
                    <h3 className="font-bold text-slate-800 dark:text-white">Participation History</h3>
                  </div>
                  {history.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No participation history yet</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#1e3040]">
                      {history.map((ev: any) => (
                        <div key={ev._id} className="p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-800 dark:text-white">{ev.title}</h4>
                            <p className="text-xs text-slate-500">
                              {ev.date} • {ev.hours}h
                            </p>
                          </div>
                          <span className="font-bold text-teal-600">+{ev.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "achievements" && (
              <motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dynamicAchievements.map((ach) => (
                    <div
                      key={ach.id}
                      className={`bg-white dark:bg-[#0a120e] rounded-lg p-4 border ${
                        ach.unlocked ? "border-amber-200 shadow-sm" : "border-slate-200 dark:border-[#1e3040] opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ach.unlocked ? "bg-amber-100" : "bg-slate-100"}`}>
                          <i className={`${ach.icon} text-2xl ${ach.unlocked ? "text-amber-600" : "text-slate-400"}`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800 dark:text-white">{ach.title}</h4>
                          <p className="text-xs text-slate-500 mb-2">{ach.description}</p>
                          <span className="text-xs font-semibold text-amber-600">+{ach.points} pts</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

