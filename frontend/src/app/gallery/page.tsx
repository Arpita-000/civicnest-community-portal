"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "../../lib/api";

export default function BeforeAfterGalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState("All");

  useEffect(() => {
    api
      .get("/gallery")
      .then((res) => {
        setItems(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const areas = ["All", ...Array.from(new Set(items.map((i) => i.area).filter(Boolean)))];
  const filtered = selectedArea === "All" ? items : items.filter((i) => i.area === selectedArea);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f4] dark:bg-[#050907]">
        <span className="loading loading-bars loading-lg text-teal-500"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f4] dark:bg-[#050907] py-12 px-4 sm:px-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="px-3 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-full text-xs font-bold uppercase tracking-widest">
            Visual Impact
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-800 dark:text-white mt-3 mb-4 tracking-tight">
            Before &amp; After Transformations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Witness the real power of community action. Every card below represents a neighborhood space restored by our volunteers and members.
          </p>
        </div>

        {areas.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {areas.map((a) => (
              <button
                key={a}
                onClick={() => setSelectedArea(a)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  selectedArea === a
                    ? "bg-teal-600 text-white shadow-md shadow-teal-500/20"
                    : "bg-white dark:bg-[#0a120e] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#14241d] hover:border-teal-500/40"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#0a120e] rounded-2xl p-12 text-center border border-slate-200/60 dark:border-[#14241d]">
            <i className="ri-image-2-line text-5xl text-slate-300 dark:text-slate-700 mb-3 block"></i>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Transformation Photos Yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              When cleanup drives and issues are completed with before &amp; after photos, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filtered.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-[#0a120e] rounded-2xl overflow-hidden border border-slate-200/70 dark:border-[#14241d] shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="grid grid-cols-2 gap-0.5 bg-slate-200 dark:bg-[#14241d] h-64 relative">
                  <div className="relative overflow-hidden">
                    {item.beforePhotos?.[0] || item.coverImage ? (
                      <img
                        src={item.beforePhotos?.[0] || item.coverImage}
                        alt="Before"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-[#0d1712] flex items-center justify-center text-slate-400 text-xs">
                        No Before Photo
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                      Before
                    </span>
                  </div>
                  <div className="relative overflow-hidden">
                    {item.afterPhotos?.[0] ? (
                      <img
                        src={item.afterPhotos[0]}
                        alt="After"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-950/30 flex items-center justify-center text-emerald-400 text-xs">
                        Completed
                      </div>
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                      After
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold">
                      <i className="ri-map-pin-line"></i> {item.area || item.location}
                    </span>
                    <span>{item.eventDate ? new Date(item.eventDate).toLocaleDateString() : ""}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
                  {item.completionNotes && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{item.completionNotes}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#14241d]">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <i className="ri-team-line text-teal-500"></i> {item.attendeeCount || 0} Volunteers participated
                    </span>
                    <Link
                      href={item._type === "issue" ? `/issues/${item._id}` : `/cleanup-events/${item._id}`}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                    >
                      View Details <i className="ri-arrow-right-line"></i>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

