"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function MyLostFoundPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/lost-found/my", { fresh: true });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleReunite = async (itemId: string) => {
    try {
      await api.post(`/lost-found/${itemId}/reunite`, {});
      toast.success("Listing marked as reunited!");
      fetchItems();
    } catch (err) {
      toast.error(errMsg(err, "Failed to resolve listing."));
    }
  };

  return (
    <div className="w-full pb-24 pt-8 px-4 md:px-8 bg-[#F8FAFC] dark:bg-[#050907] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <BackButton variant="dark" className="mb-6" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-800 bg-clip-text text-transparent mb-2">
              My Lost &amp; Found
            </h2>
            <p className="text-slate-500 dark:text-slate-300 font-medium text-[13px]">
              Track claims and sighting reports for items you posted.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/lost-found/add-lost"
              className="inline-flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
            >
              + Report Lost
            </Link>
            <Link
              href="/lost-found/add-found"
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
            >
              + Report Found
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <MinimalLoader />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] max-w-xl mx-auto shadow-sm">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No items reported</h3>
            <p className="text-slate-500 dark:text-slate-300 text-[13px] mt-2 mb-6">
              You haven&apos;t reported any lost or found items yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => {
              const isLost = item.type === "lost";
              return (
                <div
                  key={item._id}
                  className="bg-white dark:bg-[#0a120e] rounded-lg border border-slate-200 dark:border-[#1e3040] overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-slate-100 dark:bg-[#1e3040]">
                      {item.image ? (
                        <img src={item.image} alt={item.itemName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Photo</div>
                      )}
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white ${
                          isLost ? "bg-rose-500" : "bg-emerald-600"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <div className="p-5">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">{item.category}</span>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-1 mb-2 truncate">{item.itemName}</h3>
                      <p className="text-xs text-slate-500 truncate">
                        <i className="ri-map-pin-line mr-1" />
                        {item.location}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-[#14241d] flex items-center justify-between">
                    <Link href={`/lost-found/${item._id}`} className="text-xs text-teal-600 font-bold hover:underline">
                      View Details →
                    </Link>
                    {item.status !== "reunited" ? (
                      <button
                        onClick={() => handleReunite(item._id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Mark Reunited
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-black">✓ Reunited</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

