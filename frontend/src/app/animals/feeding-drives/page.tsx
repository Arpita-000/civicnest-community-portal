"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function FeedingDrivesPage() {
  const { user } = useAuth();
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/feeding-drives", { fresh: true });
      setDrives(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDrives([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const handleJoin = async (driveId: string) => {
    if (!user) return toast.error("Please login to join a feeding drive.");
    try {
      await api.post(`/feeding-drives/${driveId}/join`, { userId: user.email });
      toast.success("Joined feeding drive!");
      fetchDrives();
    } catch (err) {
      toast.error(errMsg(err, "Failed to join feeding drive"));
    }
  };

  return (
    <div className="w-full dark:bg-[#0a1410] min-h-screen pb-20">
      <div className="bg-[#40826D] text-white pt-16 pb-16 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Community Feeding Drives</h1>
          <p className="text-emerald-100 max-w-2xl text-[13px]">
            Join local volunteers in feeding stray and abandoned animals in your neighborhood.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="py-12 flex justify-center">
            <MinimalLoader />
          </div>
        ) : drives.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-xl border border-slate-100 dark:border-[#1e3040] shadow-sm">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No active drives</h3>
            <p className="text-slate-500 text-sm">There are currently no feeding drives planned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drives.map((drive) => (
              <div
                key={drive._id}
                className="bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
                    {drive.foodType || "Feeding Drive"}
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base mt-2 mb-1">{drive.title}</h3>
                  <p className="text-xs text-slate-500 mb-3">{drive.description}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <i className="ri-map-pin-line mr-1 text-teal-600" />
                    {drive.location}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <i className="ri-calendar-line mr-1 text-teal-600" />
                    {drive.date} • {drive.time}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#14241d] flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {drive.volunteerCount || drive.volunteers?.length || 0} / {drive.volunteersNeeded || 5} volunteers
                  </span>
                  <button
                    onClick={() => handleJoin(drive._id)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Join Drive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

