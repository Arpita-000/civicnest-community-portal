"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../lib/api";
import SocialFeedCard from "../../components/SocialFeedCard";

export default function RecentActivitiesPage() {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await api.get("/public/feed");
        setFeedItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  const categories = ["All", "Cleanup Drive", "Garbage", "Illegal Construction", "Broken Public Property", "Road Damage"];

  const filteredItems = feedItems.filter((item) => {
    const matchesCategory =
      activeTab === "All" ||
      (activeTab === "Cleanup Drive" && item._type === "cleanup_event") ||
      item.category === activeTab;

    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof item.location === "string" && item.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof item.location === "object" &&
        (item.location?.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCategory && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "popular") {
      const scoreA = (a.upvotes?.length || 0) - (a.downvotes?.length || 0) + (a.attendeeCount || 0) * 2;
      const scoreB = (b.upvotes?.length || 0) - (b.downvotes?.length || 0) + (b.attendeeCount || 0) * 2;
      return scoreB - scoreA;
    }
    return new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-[#f4f7f4] dark:bg-[#050907] pt-8 pb-24 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-[#14241d] pb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 mb-3 group"
            >
              <i className="ri-arrow-left-line group-hover:-translate-x-1 transition-transform"></i> Back to Home
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Activity Feed</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-base">
              Real-time stream of reported civic issues, resolution progress, and volunteer cleanup drives.
            </p>
          </div>
          <div className="flex items-center gap-3 self-center sm:self-end">
            <Link
              href="/issues/add"
              className="px-4 py-2.5 bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-sm font-medium rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <i className="ri-megaphone-line"></i> Report Issue
            </Link>
            <Link
              href="/cleanup-events/organize"
              className="px-4 py-2.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800/50 text-sm font-medium rounded-xl transition flex items-center gap-2"
            >
              <i className="ri-calendar-event-line"></i> Organize Drive
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a120e] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-[#14241d] mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Search activities by title, description, or neighborhood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0f1914] border border-slate-200 dark:border-[#14241d] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <i className="ri-close-circle-fill"></i>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sort by:</span>
              <div className="inline-flex bg-slate-100 dark:bg-[#0f1914] p-1 rounded-xl border border-slate-200/60 dark:border-[#14241d]">
                <button
                  onClick={() => setSortBy("recent")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === "recent"
                      ? "bg-white dark:bg-[#15231c] text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <i className="ri-time-line mr-1"></i> Latest
                </button>
                <button
                  onClick={() => setSortBy("popular")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === "popular"
                      ? "bg-white dark:bg-[#15231c] text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <i className="ri-fire-line mr-1"></i> Popular
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100 dark:border-[#14241d]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === cat
                    ? cat === "Cleanup Drive"
                      ? "bg-teal-600 text-white shadow-sm shadow-teal-500/20"
                      : "bg-slate-800 dark:bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-[#0f1914] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#15231c]"
                }`}
              >
                {cat === "Cleanup Drive" && <i className="ri-calendar-event-fill"></i>}
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-[#14241d] h-72 animate-pulse flex flex-col justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-[#14241d] rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-[#14241d] rounded w-1/3"></div>
                      <div className="h-3 bg-slate-200 dark:bg-[#14241d] rounded w-1/4"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-[#14241d] rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-[#14241d] rounded w-1/2"></div>
                  </div>
                  <div className="h-10 bg-slate-100 dark:bg-[#0f1914] rounded-xl w-full"></div>
                </div>
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            <motion.div layout className="space-y-6">
              <AnimatePresence mode="popLayout">
                {sortedItems.map((item) => (
                  <SocialFeedCard key={item._id} issue={item} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-[#0a120e] rounded-3xl border border-dashed border-slate-300 dark:border-[#1e3040] px-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-[#14241d] text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                <i className="ri-compass-3-line"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">No matching activities found</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                We couldn&apos;t find any reports or cleanup drives matching your current filters. Try clearing your search or switching categories.
              </p>
              <button
                onClick={() => {
                  setActiveTab("All");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#14241d] dark:hover:bg-[#1c3228] text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

