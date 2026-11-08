"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";

const DHAKA_AREAS: Record<string, [number, number]> = {
  mirpur: [23.8042, 90.3667],
  dhanmondi: [23.7461, 90.3742],
  uttara: [23.8759, 90.3795],
  gulshan: [23.7925, 90.4078],
  banani: [23.794, 90.4043],
  mohammadpur: [23.7662, 90.3589],
  motijheel: [23.733, 90.4172],
  bashundhara: [23.8191, 90.4526],
  badda: [23.7805, 90.4267],
  farmgate: [23.7561, 90.3872],
  shahbag: [23.7389, 90.3958],
  khilgaon: [23.7507, 90.4254],
  rampura: [23.7612, 90.4219],
  tejgaon: [23.7639, 90.3994],
  jatrabari: [23.7104, 90.4349],
  old_dhaka: [23.7115, 90.4071],
};

function resolveCoords(item: any, idx: number): [number, number] {
  if (item.coordinates?.lat && item.coordinates?.lng) {
    return [Number(item.coordinates.lat), Number(item.coordinates.lng)];
  }
  if (item.location?.lat && item.location?.lng) {
    return [Number(item.location.lat), Number(item.location.lng)];
  }
  const text = `${item.area || ""} ${typeof item.location === "string" ? item.location : item.location?.address || ""} ${item.title || ""}`.toLowerCase();
  for (const [key, coords] of Object.entries(DHAKA_AREAS)) {
    if (text.includes(key)) {
      const offsetLat = ((idx % 7) - 3) * 0.0022;
      const offsetLng = ((idx % 5) - 2) * 0.0022;
      return [coords[0] + offsetLat, coords[1] + offsetLng];
    }
  }
  const angle = idx * 1.1;
  const radius = 0.015 + (idx % 6) * 0.006;
  return [23.7808 + Math.cos(angle) * radius, 90.4005 + Math.sin(angle) * radius];
}

export default function CommunityMapPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/issues").catch(() => ({ data: [] })),
      api.get("/cleanup-events").catch(() => ({ data: [] })),
    ]).then(([issRes, evRes]) => {
      const issList = Array.isArray(issRes.data) ? issRes.data : issRes.data?.issues || [];
      const evList = Array.isArray(evRes.data) ? evRes.data : evRes.data?.events || [];
      setIssues(issList);
      setEvents(evList);
      setLoading(false);
    });
  }, []);

  const visibleIssues =
    filter === "events"
      ? []
      : issues
          .filter((i) => statusFilter === "all" || i.status === statusFilter)
          .map((item, idx) => ({ ...item, _kind: "issue", _coords: resolveCoords(item, idx) }));

  const visibleEvents =
    filter === "issues"
      ? []
      : events.map((ev, idx) => ({ ...ev, _kind: "event", _coords: resolveCoords(ev, idx + 100) }));

  const allMarkers = [...visibleIssues, ...visibleEvents];
  const activePin = selectedItem || allMarkers[0] || null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#050907] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">
              <i className="ri-radar-line" /> Live Civic Radar
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Interactive <span className="text-teal-500">Community Map</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore reported issues and upcoming cleanup drives pinned across neighborhoods.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-white dark:bg-[#0a120e] p-1 border border-slate-200 dark:border-[#14241d]">
              {[
                { id: "all", label: "All Pins" },
                { id: "issues", label: `Issues (${issues.length})` },
                { id: "events", label: `Drives (${events.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filter === t.id
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {filter !== "events" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#14241d] text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="action_taken">Action Taken</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="solved">Solved</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 mb-4 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0a120e] px-4 py-2.5 rounded-xl border border-slate-200/70 dark:border-[#14241d]">
          <span className="font-bold text-slate-700 dark:text-slate-200">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Pending Issue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> In Progress / Verification
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Resolved Issue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" /> Cleanup Drive
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map Embed + Pin Overlay */}
          <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-slate-200 dark:border-[#14241d] shadow-xl bg-white dark:bg-[#0a120e] h-[600px] relative flex flex-col">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-teal-500" />
              </div>
            ) : (
              <>
                <iframe
                  title="CivicNest Interactive Map"
                  className="w-full h-full border-0"
                  src={
                    activePin
                      ? `https://www.openstreetmap.org/export/embed.html?bbox=${activePin._coords[1] - 0.025}%2C${activePin._coords[0] - 0.02}%2C${activePin._coords[1] + 0.025}%2C${activePin._coords[0] + 0.02}&layer=mapnik&marker=${activePin._coords[0]}%2C${activePin._coords[1]}`
                      : "https://www.openstreetmap.org/export/embed.html?bbox=90.33%2C23.70%2C90.46%2C23.88&layer=mapnik"
                  }
                />
                {activePin && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-[#0a120e]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-[#14241d] shadow-xl flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded mb-1 ${
                          activePin._kind === "event"
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                            : activePin.status === "solved"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-rose-500/15 text-rose-600"
                        }`}
                      >
                        {activePin._kind === "event" ? "Cleanup Drive" : activePin.category || "Civic Issue"} •{" "}
                        {activePin.status || "Upcoming"}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{activePin.title}</h4>
                      <p className="text-xs text-slate-500 truncate">
                        <i className="ri-map-pin-line mr-1" />
                        {typeof activePin.location === "string"
                          ? activePin.location
                          : activePin.location?.address || activePin.area || "Dhaka"}
                      </p>
                    </div>
                    <Link
                      href={activePin._kind === "event" ? `/cleanup-events/${activePin._id}` : `/issues/${activePin._id}`}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold whitespace-nowrap transition"
                    >
                      Open Details →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pin Directory Sidebar */}
          <div className="bg-white dark:bg-[#0a120e] rounded-3xl border border-slate-200 dark:border-[#14241d] shadow-sm h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-[#14241d] flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Pinned Locations ({allMarkers.length})
              </h3>
              <span className="text-xs text-slate-400">Click to focus</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#14241d]">
              {allMarkers.map((item) => {
                const isSelected = activePin?._id === item._id;
                const dotColor =
                  item._kind === "event"
                    ? "bg-sky-500"
                    : item.status === "solved"
                    ? "bg-emerald-500"
                    : item.status === "action_taken" || item.status === "pending_verification"
                    ? "bg-amber-500"
                    : "bg-rose-500";
                return (
                  <button
                    key={`${item._kind}-${item._id}`}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-4 transition flex items-start gap-3 ${
                      isSelected
                        ? "bg-teal-50/70 dark:bg-teal-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-[#0f1914]"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {typeof item.location === "string"
                          ? item.location
                          : item.location?.address || item.area || "Dhaka"}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-semibold uppercase text-teal-600 dark:text-teal-400">
                          {item._kind === "event" ? "Cleanup Drive" : item.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item._coords[0].toFixed(3)}, {item._coords[1].toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

