"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api, { errMsg } from "../../lib/api";
import { BackButton, MinimalLoader } from "../../components/ui";

const QUICK_FILTERS = [
  { label: "All", value: null, icon: "ri-apps-2-fill", bg: "bg-teal-600", text: "text-white" },
  { label: "Urgent", value: "emergency", icon: "ri-alert-fill", bg: "bg-rose-100", text: "text-rose-700" },
  { label: "Needs Rescue", value: "needs-help", icon: "ri-hospital-fill", bg: "bg-amber-100", text: "text-amber-700" },
  { label: "Adoptable", value: "rescued", icon: "ri-home-heart-fill", bg: "bg-emerald-100", text: "text-emerald-700" },
];

const ANIMAL_TYPES = ["Dog", "Cat", "Cow", "Bird", "Other"];

export default function AnimalsBrowsePage() {
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveData, setDriveData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    foodType: "",
    volunteersNeeded: 5,
  });

  useEffect(() => {
    api
      .get("/animals/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  const loadAnimals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/animals", {
        params: {
          urgency: urgencyFilter || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          area: areaFilter || undefined,
        },
        fresh: true,
      });
      setAnimals(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAnimals([]);
    } finally {
      setLoading(false);
    }
  }, [urgencyFilter, statusFilter, typeFilter, areaFilter]);

  useEffect(() => {
    loadAnimals();
  }, [loadAnimals]);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/feeding-drives", driveData);
      toast.success("Feeding drive organized successfully!");
      setShowDriveModal(false);
      setDriveData({ title: "", description: "", date: "", time: "", location: "", foodType: "", volunteersNeeded: 5 });
    } catch (err) {
      toast.error(errMsg(err, "Failed to create feeding drive"));
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#050907]">
      <div className="relative pt-16 pb-12 px-[5%] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80"
            alt="Animal Rescue"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/95 to-teal-900/80 backdrop-blur-sm"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="mb-6">
            <BackButton variant="light" />
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
            <div className="text-white max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-4 text-emerald-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider">Community Rescue</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">Animal Rescue Center</h1>
              <p className="text-emerald-50/90 text-[13px] font-medium max-w-xl">
                Report stray animals in need of medical attention, shelter, or food. Help save lives in our community and provide verified updates.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0 w-full md:w-64">
              <button
                onClick={() => setShowDriveModal(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-xl cursor-pointer"
              >
                <i className="ri-restaurant-2-fill"></i>
                <span>Organize Feeding Drive</span>
              </button>
              <Link
                href="/animals/feeding-drives"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-lg text-xs"
              >
                <i className="ri-calendar-check-line"></i> View Feeding Drives
              </Link>
              <Link
                href="/animals/add"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-teal-800 font-bold rounded-lg shadow-xl"
              >
                <i className="ri-megaphone-fill"></i>
                <span>Report Stray Animal</span>
              </Link>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
              {[
                { label: "Reported", val: stats.total || 0, icon: "ri-volume-up-fill", color: "text-teal-400" },
                { label: "Urgent Rescues", val: stats.urgent || 0, icon: "ri-alert-fill", color: "text-amber-400" },
                { label: "In Treatment", val: stats.inTreatment || 0, icon: "ri-hospital-line", color: "text-blue-400" },
                { label: "Rescued", val: stats.rescued || 0, icon: "ri-heart-pulse-fill", color: "text-emerald-400" },
              ].map((st, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 flex items-center gap-4 text-white">
                  <div className={`w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg ${st.color}`}>
                    <i className={st.icon}></i>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{st.val}</div>
                    <div className="text-xs font-bold text-emerald-100 uppercase tracking-wider">{st.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-[#0a120e] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-[#1e3040] mb-8 space-y-4">
            <div className="flex flex-wrap gap-2.5">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    if (f.value === "emergency") {
                      setUrgencyFilter("emergency");
                      setStatusFilter(null);
                    } else if (f.value === "needs-help") {
                      setUrgencyFilter(null);
                      setStatusFilter("needs-help");
                    } else if (f.value === "rescued") {
                      setUrgencyFilter(null);
                      setStatusFilter("rescued");
                    } else {
                      setUrgencyFilter(null);
                      setStatusFilter(null);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    (f.value === null && !urgencyFilter && !statusFilter) ||
                    (f.value === "emergency" && urgencyFilter === "emergency") ||
                    (f.value === "needs-help" && statusFilter === "needs-help") ||
                    (f.value === "rescued" && statusFilter === "rescued")
                      ? `${f.bg} ${f.text} ring-2 ring-teal-500`
                      : "bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <i className={f.icon} />
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-[#14241d]">
              <select
                value={typeFilter || ""}
                onChange={(e) => setTypeFilter(e.target.value || null)}
                className="bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]"
              >
                <option value="">All Animals</option>
                {ANIMAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                placeholder="Search Area / Location..."
                className="bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1]"
              />

              <button
                onClick={() => {
                  setUrgencyFilter(null);
                  setStatusFilter(null);
                  setTypeFilter(null);
                  setAreaFilter("");
                }}
                className="px-6 py-2 bg-slate-100 dark:bg-[#1e3040] text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <MinimalLoader />
            </div>
          ) : animals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">No animals found</h3>
              <p className="text-slate-500 dark:text-slate-300 max-w-sm mx-auto text-sm">
                Try a different filter, or be the first to report an animal that needs help.
              </p>
              <Link
                href="/animals/add"
                className="mt-6 inline-block px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg"
              >
                Report an Animal
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {animals.map((animal, idx) => (
                <motion.div
                  key={animal._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx % 6) * 0.04 }}
                  className="bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="relative h-48 bg-slate-100 dark:bg-[#1e3040]">
                    <img
                      src={animal.image || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800"}
                      alt={animal.animalType}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes("1543466835")) {
                          target.src = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800";
                        }
                      }}
                    />
                    <span
                      className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${
                        animal.urgency === "emergency" || animal.urgency === "high"
                          ? "bg-rose-500"
                          : animal.urgency === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    >
                      {animal.urgency}
                    </span>
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-900/80 text-white">
                      {animal.status || "needs-help"}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400">{animal.animalType || "Animal"}</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-1 mb-2 line-clamp-2">{animal.condition}</h3>
                    <p className="text-xs text-slate-500 mt-auto mb-4">
                      <i className="ri-map-pin-line mr-1 text-teal-600" />
                      {animal.location}
                    </p>
                    <Link
                      href={`/animals/${animal._id}`}
                      className="block w-full text-center py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-300 text-xs font-bold transition"
                    >
                      View &amp; Help →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDriveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDriveModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0a120e] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-[#1e3040]"
          >
            <div className="p-4 bg-teal-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Organize a Feeding Drive</h3>
                <p className="text-teal-100 text-xs">Plan and schedule a drive to feed animals in need.</p>
              </div>
              <button onClick={() => setShowDriveModal(false)} className="text-white text-xl">
                ×
              </button>
            </div>
            <form onSubmit={handleCreateDrive} className="p-5 space-y-4">
              <input
                type="text"
                required
                placeholder="Drive Title *"
                value={driveData.title}
                onChange={(e) => setDriveData({ ...driveData, title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
              />
              <textarea
                required
                rows={3}
                placeholder="Description *"
                value={driveData.description}
                onChange={(e) => setDriveData({ ...driveData, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  value={driveData.date}
                  onChange={(e) => setDriveData({ ...driveData, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Time (e.g. 4:00 PM)"
                  value={driveData.time}
                  onChange={(e) => setDriveData({ ...driveData, time: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Location *"
                value={driveData.location}
                onChange={(e) => setDriveData({ ...driveData, location: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Food Type *"
                  value={driveData.foodType}
                  onChange={(e) => setDriveData({ ...driveData, foodType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  required
                  min={1}
                  value={driveData.volunteersNeeded}
                  onChange={(e) => setDriveData({ ...driveData, volunteersNeeded: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowDriveModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl">
                  Create Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

