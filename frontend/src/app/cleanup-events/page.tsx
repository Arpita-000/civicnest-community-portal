"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api, { errMsg } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../components/ui";
import PremiumEventCard from "../../components/PremiumEventCard";

export default function CleanupEventsPage() {
  const { user, role } = useAuth();
  const [filter, setFilter] = useState("upcoming");
  const [area, setArea] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVolunteer, setIsVolunteer] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/cleanup-events", {
        params: { upcoming: filter === "upcoming", area: area || undefined, page: 1, limit: 24 },
        fresh: true,
      });
      setEvents(res.data?.events || []);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load cleanup events"));
    } finally {
      setLoading(false);
    }
  }, [filter, area]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!user?.email) return;
    api
      .get("/volunteers/status")
      .then((res) => setIsVolunteer(res.data?.volunteer?.approvalStatus === "approved"))
      .catch(() => setIsVolunteer(false));
  }, [user?.email]);

  const handleInterested = async (id: string) => {
    if (!user) return toast.error("Please login to mark interest");
    try {
      const res = await api.post(`/cleanup-events/${id}/interested`);
      toast.success(res.data?.interested ? "Interest marked successfully!" : "Interest removed!");
      fetchEvents();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update interest"));
    }
  };

  const handleGoing = async (id: string) => {
    if (!user) return toast.error("Please login to volunteer");
    const ev = events.find((e) => e._id === id);
    const userGoing = ev?.going?.some((a: any) => a.email === user?.email);
    if (!userGoing) {
      if (role !== "member" && role !== "admin" && !isVolunteer) {
        return toast.error("Please register as a volunteer or member first.");
      }
    }
    try {
      const res = await api.post(`/cleanup-events/${id}/going`);
      if (res.data?.full) {
        toast("This event is full, but you can still mark yourself as Interested!");
      } else {
        toast.success(res.data?.going ? "Volunteer RSVP confirmed!" : "Volunteer RSVP removed!");
      }
      fetchEvents();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update volunteer status"));
    }
  };

  return (
    <div className="min-h-screen">
      <div className="relative pt-16 pb-16 px-[5%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
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
                <span className="text-[13px] font-bold uppercase tracking-wider">Community Gatherings</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">Social Events</h1>
              <p className="text-white/80 text-[13px] max-w-2xl">
                Discover and join community gatherings, cleanup workshops, and social drives. Connect with like-minded neighbors and make a difference together.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <i className="ri-group-line text-2xl text-emerald-300"></i>
                  <div>
                    <p className="text-2xl font-bold text-white">1,234</p>
                    <p className="text-xs text-white/60 uppercase tracking-wider">Members</p>
                  </div>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <i className="ri-calendar-event-line text-2xl text-emerald-300"></i>
                  <div>
                    <p className="text-2xl font-bold text-white">{events.length || 56}</p>
                    <p className="text-xs text-white/60 uppercase tracking-wider">Events</p>
                  </div>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <i className="ri-trophy-line text-2xl text-emerald-300"></i>
                  <div>
                    <p className="text-2xl font-bold text-white">89%</p>
                    <p className="text-xs text-white/60 uppercase tracking-wider">Engagement</p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/cleanup-events/organize"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-[#0a120e] hover:bg-emerald-50 text-teal-700 font-bold rounded-lg shadow-xl transition-all transform hover:scale-105"
            >
              <i className="ri-add-circle-line text-2xl"></i>
              <span>Create Event</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-[5%] py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="flex bg-slate-100 dark:bg-[#1e3040]/80 rounded-xl p-1 border border-slate-200 dark:border-[#1e3040] shadow-sm">
              {["upcoming", "all"].map((f) => (
                <motion.button
                  key={f}
                  onClick={() => setFilter(f)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative px-6 py-2 rounded-lg text-[13px] font-bold capitalize transition-all duration-200 cursor-pointer select-none ${
                    filter === f
                      ? "text-teal-700 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {filter === f && (
                    <motion.div
                      layoutId="activeFilter"
                      className="absolute inset-0 bg-white dark:bg-[#0a120e] shadow-sm rounded-lg border border-slate-200 dark:border-[#1e3040]/50"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{f}</span>
                </motion.button>
              ))}
            </div>

            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] rounded-xl focus:outline-none focus:border-teal-500 min-w-[200px] shadow-sm text-[13px] font-semibold text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="">All Areas</option>
              <option value="Mirpur">Mirpur</option>
              <option value="Gulshan">Gulshan</option>
              <option value="Banani">Banani</option>
              <option value="Dhanmondi">Dhanmondi</option>
              <option value="Uttara">Uttara</option>
            </select>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <MinimalLoader />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] shadow-sm">
              <i className="ri-calendar-close-line text-6xl text-teal-600/30 mb-4 block"></i>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-[#cbd5e1] mb-2">No cleanup drives found</h3>
              <p className="text-slate-500 dark:text-slate-300 max-w-sm mx-auto mb-6">
                There are no {filter} events in {area || "any area"}. Why not organize one yourself?
              </p>
              <Link
                href="/cleanup-events/organize"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                <i className="ri-add-line"></i> Organize a Drive
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <PremiumEventCard
                  key={event._id}
                  event={event}
                  currentUser={user}
                  userInterested={event.interested?.includes(user?.email)}
                  userGoing={event.going?.some((a: any) => a.email === user?.email)}
                  onInterested={handleInterested}
                  onGoing={handleGoing}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

