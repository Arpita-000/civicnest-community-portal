"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "../../../lib/api";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function MyAnimalsPage() {
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/animals/my", { fresh: true })
      .then((res) => setAnimals(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAnimals([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#050907] py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <BackButton variant="dark" className="mb-6" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Animal Reports</h1>
            <p className="text-xs text-slate-500 mt-1">Track stray animal rescue reports you submitted.</p>
          </div>
          <Link href="/animals/add" className="px-5 py-3 bg-teal-600 text-white font-bold text-xs rounded-xl">
            + Report Stray Animal
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <MinimalLoader />
          </div>
        ) : animals.length === 0 ? (
          <div className="bg-white dark:bg-[#0a120e] rounded-xl p-12 text-center border border-slate-200 dark:border-[#1e3040]">
            <p className="text-slate-500">You haven&apos;t reported any animals yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {animals.map((a) => (
              <div
                key={a._id}
                className="bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] overflow-hidden shadow-sm p-5 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-teal-600">{a.animalType}</span>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-1 mb-2">{a.condition}</h3>
                  <p className="text-xs text-slate-500 mb-4">{a.location}</p>
                </div>
                <Link href={`/animals/${a._id}`} className="text-xs font-bold text-teal-600 hover:underline">
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

