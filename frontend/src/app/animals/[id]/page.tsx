"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function AnimalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState("");
  const [tipLoading, setTipLoading] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState(300);

  const loadAnimal = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/animals/${id}`, { fresh: true })
      .then((res) => setAnimal(res.data))
      .catch(() => setAnimal(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadAnimal();
  }, [loadAnimal]);

  const handleVolunteer = async () => {
    if (!user) return toast.error("Please sign in to volunteer");
    try {
      const res = await api.post(`/animals/${id}/volunteer`);
      toast.success(res.data?.volunteered ? "Thanks for volunteering! 🐾" : "Withdrawn from volunteering.");
      loadAnimal();
    } catch (err) {
      toast.error(errMsg(err, "Failed to volunteer"));
    }
  };

  const handleLoadTip = async () => {
    if (tip) return;
    setTipLoading(true);
    try {
      const res = await api.post("/ai/animal-tip", {
        animalType: animal.animalType || animal.type,
        condition: animal.condition,
      });
      setTip(res.data?.tip || "");
    } catch {
      toast.error("Could not load AI tip.");
    } finally {
      setTipLoading(false);
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to donate");
    try {
      await api.post(`/animals/${id}/donate`, { amount: Number(donateAmount) });
      toast.success(`Thank you for donating ৳${donateAmount} for this animal's care!`);
      setDonateOpen(false);
      loadAnimal();
    } catch (err) {
      toast.error(errMsg(err, "Donation failed"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MinimalLoader />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold text-slate-700 dark:text-slate-200">Animal report not found.</p>
      </div>
    );
  }

  const isVolunteer = animal.volunteers?.some((v: any) => (typeof v === "string" ? v === user?.email : v?.email === user?.email));

  return (
    <div className="min-h-screen dark:bg-[#0a1410] pt-12 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <BackButton variant="dark" />
        </div>

        <div className="bg-white dark:bg-[#0a120e] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040] overflow-hidden mb-8">
          <div className="h-64 md:h-96 w-full relative bg-slate-100 dark:bg-[#1e3040]">
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
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-4 py-1.5 rounded-full text-xs font-extrabold uppercase bg-rose-500 text-white">
                {animal.urgency} Urgency
              </span>
              <span className="px-4 py-1.5 rounded-full text-xs font-extrabold uppercase bg-teal-600 text-white">
                {animal.status || "needs-help"}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white capitalize mb-4">
              {animal.animalType || "Stray Animal"} in Need
            </h1>

            <div className="flex flex-wrap gap-3 mb-6">
              <span className="bg-slate-100 dark:bg-[#1e3040] text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                Spotted: {animal.date || "Recently"}
              </span>
              <span className="bg-slate-100 dark:bg-[#1e3040] text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                🙋 {animal.volunteerCount || animal.volunteers?.length || 0} Helping
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Condition Details</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap">{animal.condition}</p>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 mb-6">
              <button
                onClick={handleLoadTip}
                className="w-full flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300 text-xs cursor-pointer"
              >
                <span>💡 {tipLoading ? "Loading AI First-Aid Guide..." : "View AI First-Aid Guide"}</span>
                <i className="ri-sparkling-fill" />
              </button>
              {tip && <p className="mt-3 pt-3 border-t border-emerald-200/60 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line">{tip}</p>}
            </div>

            <div className="bg-slate-50 dark:bg-[#0a1410] p-4 rounded-xl border border-slate-100 dark:border-[#14241d] mb-6">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">Location</h3>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{animal.location}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-[#14241d]">
              <button
                onClick={handleVolunteer}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm cursor-pointer ${
                  isVolunteer ? "bg-slate-200 text-slate-700" : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                {isVolunteer ? "Withdraw from volunteering" : "Volunteer to Help"}
              </button>
              <button
                onClick={() => setDonateOpen(true)}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm border-2 border-teal-600 text-teal-600 hover:bg-teal-50 cursor-pointer"
              >
                Donate to Care
              </button>
            </div>
          </div>
        </div>
      </div>

      {donateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDonateOpen(false)}>
          <form
            onSubmit={handleDonate}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-[#1e3040] space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Donate to Care</h3>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Amount (৳)</label>
              <input
                type="number"
                min={50}
                value={donateAmount}
                onChange={(e) => setDonateAmount(Number(e.target.value))}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] font-bold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDonateOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl">
                Donate ৳{donateAmount}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

