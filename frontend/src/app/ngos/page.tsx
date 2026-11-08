"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "../../lib/api";
import { BackButton, MinimalLoader } from "../../components/ui";

const FOCUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Environment 🌿", value: "environment" },
  { label: "Education 📚", value: "education" },
  { label: "Health 🏥", value: "health" },
  { label: "Animals 🐾", value: "animals" },
  { label: "Community 👥", value: "community" },
];

export default function NGODirectoryPage() {
  const [focusFilter, setFocusFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [ngos, setNgos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/ngos/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/ngos", { params: { search: searchQuery || undefined } })
      .then((res) => setNgos(Array.isArray(res.data) ? res.data : res.data?.ngos || []))
      .catch(() => setNgos([]))
      .finally(() => setLoading(false));
  }, [searchQuery]);

  const filteredNGOs = ngos.filter((ngo) => {
    const matchesVerified = !verifiedOnly || ngo.status === "verified" || ngo.status === "approved";
    const matchesFocus = !focusFilter || ngo.focusAreas?.includes(focusFilter);
    const matchesSearch =
      !searchQuery ||
      ngo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ngo.mission?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVerified && matchesFocus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#050907]">
      <div className="relative pt-16 pb-12 px-[5%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-4 text-emerald-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[13px] font-semibold uppercase tracking-wider">NGO Directory</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">Connect with Organizations</h1>
              <p className="text-white/80 text-[13px] max-w-2xl">
                Discover and support verified Non-Governmental Organizations working to improve our community.
              </p>
            </div>

            <Link
              href="/ngos/register"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-teal-700 font-bold rounded-lg shadow-xl hover:scale-105 transition-transform"
            >
              <i className="ri-building-2-line text-xl" />
              <span>Register NGO</span>
            </Link>
          </div>

          {stats && (
            <div className="flex flex-wrap gap-6 mt-8 pt-6 border-t border-white/15 text-white">
              <div>
                <p className="text-2xl font-black">{stats.total ?? ngos.length}</p>
                <p className="text-xs text-white/70 uppercase">Partner NGOs</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.verified ?? ngos.length}</p>
                <p className="text-xs text-white/70 uppercase">Verified</p>
              </div>
              <div>
                <p className="text-2xl font-black">100+</p>
                <p className="text-xs text-white/70 uppercase">Communities</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 space-y-4">
            <input
              type="text"
              placeholder="🔍 Search NGO name or focus area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] rounded-xl text-slate-800 dark:text-white"
            />

            <div className="flex flex-wrap items-center gap-2">
              {FOCUS_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFocusFilter(f.value)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    focusFilter === f.value
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white dark:bg-[#0a120e] border-slate-200 dark:border-[#1e3040] text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  verifiedOnly
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white dark:bg-[#0a120e] border-slate-200 dark:border-[#1e3040] text-slate-600 dark:text-slate-300"
                }`}
              >
                Verified Only
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <MinimalLoader />
            </div>
          ) : filteredNGOs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">No NGOs found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                There are currently no NGOs in the directory matching your criteria.
              </p>
              <Link href="/ngos/register" className="mt-6 inline-block px-6 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg">
                Register Your NGO
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNGOs.map((ngo, idx) => (
                <motion.div
                  key={ngo._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={ngo.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(ngo.name || "NGO")}&background=0d9488&color=fff`}
                        alt={ngo.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes("ui-avatars")) {
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ngo.name || "NGO")}&background=0d9488&color=fff`;
                          }
                        }}
                      />
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-base">{ngo.name}</h3>
                        <span className="text-[10px] font-bold uppercase text-teal-600">
                          {ngo.status === "verified" ? "✓ Verified NGO" : "Community Organization"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4">{ngo.mission}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(ngo.focusAreas || []).map((fa: string, i: number) => (
                        <span key={i} className="px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-full text-[10px] font-semibold">
                          {fa}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/ngos/${ngo._id}`}
                    className="block w-full text-center py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition"
                  >
                    View Profile &amp; Support →
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

