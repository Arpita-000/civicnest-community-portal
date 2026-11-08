"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "../../lib/api";
import { BackButton, MinimalLoader } from "../../components/ui";

const CATEGORY_FILTERS = [
  { label: "All", value: "" },
  { label: "Pets", value: "pets" },
  { label: "Electronics", value: "electronics" },
  { label: "Documents", value: "documents" },
  { label: "Keys", value: "keys" },
  { label: "Clothing", value: "clothing" },
  { label: "Other", value: "other" },
];

function LostFoundContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeView = searchParams?.get("type") === "found" ? "found" : "lost";
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/lost-found/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/lost-found", { params: { search: searchQuery || undefined } })
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [searchQuery]);

  const filteredItems = items.filter((item) => {
    const matchesType = item.type === typeView;
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesType && matchesCategory;
  });

  const bannerGradient =
    typeView === "lost"
      ? "bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900"
      : "bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050907]">
      <div className={`relative pt-16 pb-12 px-[5%] ${bannerGradient} overflow-hidden`}>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="text-white">
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-4 ${
                  typeView === "lost" ? "text-rose-300" : "text-emerald-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full animate-pulse ${typeView === "lost" ? "bg-rose-400" : "bg-emerald-400"}`}></span>
                <span className="text-xs font-bold uppercase tracking-widest">
                  {typeView === "lost" ? "Lost & Found" : "Found Items"}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
                {typeView === "lost" ? "Report Lost Items" : "Report Found Items"}
              </h1>
              <p className="text-white/80 text-[13px] max-w-2xl font-medium">
                {typeView === "lost"
                  ? "Help reunite neighbors with their belongings. Report lost items to get community assistance."
                  : "Found something? Help reunite it with its owner by reporting it here."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={typeView === "lost" ? "/lost-found/add-lost" : "/lost-found/add-found"}
                className="inline-flex items-center gap-3 px-6 py-3.5 bg-white text-slate-800 font-bold rounded-lg shadow-xl hover:scale-105 transition-transform"
              >
                <i className={typeView === "lost" ? "ri-search-line text-rose-600" : "ri-gift-line text-emerald-600"} />
                <span>{typeView === "lost" ? "Report Lost" : "Report Found"}</span>
              </Link>
              <Link
                href="/lost-found/my"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-lg hover:bg-white/20 transition"
              >
                <i className="ri-folder-user-line" /> My Listings
              </Link>
            </div>
          </div>

          {stats && (
            <div className="flex flex-wrap gap-6 mt-8 pt-6 border-t border-white/10">
              <div>
                <p className="text-2xl font-black text-white">{stats.active ?? 0}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">Active</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stats.reunited ?? 0}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">Reunited</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stats.thisWeek ?? 0}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">This Week</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex bg-slate-200/55 dark:bg-[#14241d] p-1.5 rounded-lg max-w-md mx-auto">
              {[
                { label: "Lost", value: "lost" },
                { label: "Found", value: "found" },
              ].map((t) => {
                const isActive = typeView === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => router.push(`/lost-found?type=${t.value}`)}
                    className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? t.value === "lost"
                          ? "bg-rose-500 text-white shadow-md"
                          : "bg-emerald-600 text-white shadow-md"
                        : "text-slate-500 dark:text-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-md mx-auto mb-6 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name or description..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] rounded-lg outline-none text-[13px] text-slate-800 dark:text-white"
            />
            <i className="ri-search-line text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  categoryFilter === cat.value
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-[#0a120e] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3040]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <MinimalLoader />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] max-w-xl mx-auto shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
                No {typeView} items found
              </h3>
              <p className="text-slate-500 dark:text-slate-300 text-[13px] max-w-sm mx-auto">
                Try a different category, or be the first to report a {typeView} item.
              </p>
              <Link
                href={typeView === "lost" ? "/lost-found/add-lost" : "/lost-found/add-found"}
                className="mt-6 inline-block px-6 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg"
              >
                {typeView === "lost" ? "Report Lost Item" : "Report Found Item"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="relative h-48 bg-slate-100 dark:bg-[#1e3040]">
                    {item.image ? (
                      <img src={item.image} alt={item.itemName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Photo</div>
                    )}
                    <span
                      className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${
                        item.type === "lost" ? "bg-rose-500" : "bg-emerald-600"
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.reward > 0 && (
                      <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
                        Reward ৳{item.reward}
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400 mb-1">{item.category}</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-base mb-1 line-clamp-1">{item.itemName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                    <p className="text-xs text-slate-500 mt-auto mb-4">
                      <i className="ri-map-pin-line mr-1 text-teal-600" />
                      {item.location}
                    </p>
                    <Link
                      href={`/lost-found/${item._id}`}
                      className="block w-full text-center py-2.5 rounded-xl bg-slate-100 dark:bg-[#14241d] hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                    >
                      View Details →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LostFoundBrowsePage() {
  return (
    <Suspense fallback={<div className="py-24 flex justify-center"><MinimalLoader /></div>}>
      <LostFoundContent />
    </Suspense>
  );
}

