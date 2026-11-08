"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api, { errMsg } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BackButton } from "../../components/ui";
import PremiumEventCard from "../../components/PremiumEventCard";

const TABS = [
  { key: "drives", label: "Upcoming Drives", icon: "ri-calendar-event-line" },
  { key: "opportunities", label: "Open Opportunities", icon: "ri-flashlight-line" },
  { key: "directory", label: "Volunteer Directory", icon: "ri-group-line" },
];

export default function VolunteerHubPage() {
  const { user, role } = useAuth();
  const [tab, setTab] = useState("drives");
  const [areaFilter, setAreaFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  const [drives, setDrives] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isVolunteer = statusData?.volunteer?.approvalStatus === "approved";
  const isPendingVolunteer = statusData?.volunteer?.approvalStatus === "pending";
  const isMember = role === "member" || role === "admin" || isVolunteer;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const evRes = await api.get("/cleanup-events", {
        params: { upcoming: true, limit: 6, area: areaFilter || undefined },
      });
      setDrives(evRes.data?.events || []);

      if (tab === "opportunities") {
        const oppRes = await api.get("/volunteers/opportunities", {
          params: { area: areaFilter || undefined, skill: skillFilter || undefined },
        });
        setOpps(oppRes.data?.opportunities || []);
      } else if (tab === "directory") {
        const dirRes = await api.get("/volunteers", {
          params: { area: areaFilter || undefined, skill: skillFilter || undefined },
        });
        setVolunteers(dirRes.data?.volunteers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab, areaFilter, skillFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.email) return;
    api
      .get("/volunteers/status")
      .then((res) => setStatusData(res.data))
      .catch(() => setStatusData(null));
  }, [user?.email]);

  const handleInterested = async (id: string) => {
    if (!user) return toast.error("Please log in to mark interest.");
    try {
      await api.post(`/cleanup-events/${id}/interested`);
      toast.success("Interest updated!");
      loadData();
    } catch (err) {
      toast.error(errMsg(err, "Could not update interest."));
    }
  };

  const handleGoing = async (id: string) => {
    if (!user) return toast.error("Please log in to volunteer.");
    try {
      const res = await api.post(`/cleanup-events/${id}/going`);
      toast.success(res.data?.going ? "You're going!" : "RSVP removed.");
      loadData();
    } catch (err) {
      toast.error(errMsg(err, "Could not update RSVP."));
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0b1215]">
      <div className="relative bg-gradient-to-br from-teal-900 to-emerald-900 pt-20 pb-20 px-[5%] overflow-hidden">
        <div className="relative max-w-7xl mx-auto z-10 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <BackButton variant="light" />
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-300">
                <i className={isMember ? "ri-shield-check-fill text-emerald-400" : "ri-shield-star-fill animate-pulse"} />
                {isMember ? "Verified Community Member" : "Community Volunteer Program"}
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
              {isMember ? "Let's Clean Together" : "Step Up For Your Community"}
            </h1>

            <p className="text-[13px] text-white/80 max-w-2xl mx-auto lg:mx-0 mb-6 leading-relaxed">
              Join upcoming drives, help resolve neighborhood issues, and earn double points for your civic contributions!
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 text-[13px] font-bold mb-8">
              <i className="ri-flashlight-fill text-amber-400 animate-pulse" />
              <span>
                Volunteers receive <strong className="text-amber-200 underline">2x Points Multiplier</strong> for all cleanup activities!
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              {!user ? (
                <Link href="/login" className="px-8 py-4 bg-white text-teal-900 font-extrabold rounded-lg hover:scale-105 transition-transform shadow-lg">
                  Log In to Participate
                </Link>
              ) : isVolunteer ? (
                <Link
                  href="/volunteer-dashboard"
                  className="px-8 py-4 bg-white text-teal-800 font-extrabold rounded-lg hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
                >
                  <i className="ri-dashboard-fill" /> My Volunteer Dashboard
                </Link>
              ) : isPendingVolunteer ? (
                <div className="px-8 py-4 bg-amber-500/10 border border-amber-300/30 text-amber-300 font-extrabold rounded-lg flex items-center gap-2">
                  <i className="ri-time-line animate-pulse" /> Volunteer Registration Pending
                </div>
              ) : (
                <Link
                  href="/volunteers/register"
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold rounded-lg hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
                >
                  <i className="ri-user-add-line" /> Join as Volunteer
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-white dark:bg-[#0a120e] border-b border-gray-200 dark:border-[#1e3040]">
        <div className="max-w-7xl mx-auto px-[5%]">
          <div className="flex items-center justify-between gap-4 py-3 overflow-x-auto">
            <div className="flex bg-slate-100 dark:bg-[#1e3040] p-1.5 rounded-lg gap-1 flex-shrink-0">
              {TABS.map((t) => {
                const isActive = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <i className={t.icon} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <input
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                placeholder="Filter by area..."
                className="px-3 py-1.5 text-[13px] border border-gray-200 dark:border-[#1e3040] rounded-lg bg-white dark:bg-[#0a120e] w-36 text-gray-800 dark:text-white"
              />
              {tab !== "drives" && (
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="px-4 py-2 text-[13px] font-semibold border border-slate-200 dark:border-[#1e3040] rounded-xl bg-white dark:bg-[#0a120e] text-slate-700 dark:text-[#cbd5e1]"
                >
                  <option value="">All skills</option>
                  {["Medical", "Plumbing", "Electrical", "Driving", "Teaching", "General Cleanup", "Animal Care"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-[5%] py-8">
        <AnimatePresence mode="wait">
          {tab === "drives" && (
            <motion.div key="drives" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Drives</h2>
                <Link
                  href="/cleanup-events/organize"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold rounded-xl"
                >
                  + Organize a Drive
                </Link>
              </div>
              {loading ? (
                <div className="py-12 text-center text-slate-400">Loading drives...</div>
              ) : drives.length === 0 ? (
                <div className="py-16 text-center text-slate-500">No upcoming drives found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drives.map((ev) => (
                    <PremiumEventCard
                      key={ev._id}
                      event={ev}
                      currentUser={user}
                      userInterested={ev.interested?.includes(user?.email)}
                      userGoing={ev.going?.some((a: any) => a.email === user?.email)}
                      onInterested={handleInterested}
                      onGoing={handleGoing}
                    />
                  ))}
                </div>
              )}
              <div className="mt-8 text-center">
                <Link
                  href="/cleanup-events"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-[#1e3040] rounded-xl text-gray-600 dark:text-slate-300 hover:border-teal-500 font-semibold text-[13px]"
                >
                  View All Events →
                </Link>
              </div>
            </motion.div>
          )}

          {tab === "opportunities" && (
            <motion.div key="opps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Open Opportunities</h2>
                <p className="text-[13px] text-gray-500 dark:text-slate-300">
                  Cleanup events, feeding drives, and civic issues that need volunteer help right now.
                </p>
              </div>
              {opps.length === 0 ? (
                <div className="py-16 text-center text-slate-500">No open opportunities matching your filters right now.</div>
              ) : (
                <div className="space-y-4">
                  {opps.map((opp) => (
                    <div
                      key={`${opp.type}-${opp._id}`}
                      className="bg-white dark:bg-[#0a120e] rounded-xl p-5 border border-slate-200 dark:border-[#1e3040] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                          {opp.type?.replace("_", " ") || "Opportunity"}
                        </span>
                        <h3 className="font-bold text-slate-800 dark:text-white text-base mt-1">{opp.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <i className="ri-map-pin-line mr-1" />
                          {opp.area || opp.location?.address || "Dhaka"}
                        </p>
                      </div>
                      <Link
                        href={
                          opp.type === "cleanup_event"
                            ? `/cleanup-events/${opp._id}`
                            : opp.type === "feeding_drive"
                            ? `/animals/feeding-drives`
                            : `/issues/${opp._id}`
                        }
                        className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl whitespace-nowrap"
                      >
                        Volunteer Now →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "directory" && (
            <motion.div key="directory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Volunteer Directory</h2>
                <p className="text-[13px] text-gray-500 dark:text-slate-300">Connect with registered volunteers in your area.</p>
              </div>
              {volunteers.length === 0 ? (
                <div className="py-16 text-center text-slate-500">No volunteers found for this filter.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {volunteers.map((vol) => (
                    <div
                      key={vol._id}
                      className="bg-white dark:bg-[#0a120e] rounded-xl p-5 border border-slate-200 dark:border-[#1e3040] flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
                        {vol.photoURL ? (
                          <img src={vol.photoURL} alt={vol.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          (vol.name || "V").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">{vol.name || "Volunteer"}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          <i className="ri-map-pin-line mr-1" />
                          {vol.area || "Dhaka"} • {vol.availability || "Anytime"}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(vol.skills || []).slice(0, 3).map((sk: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-full text-[10px] font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

