"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton } from "../../../components/ui";
import ImageUploader from "../../../components/ImageUploader";

const ANIMAL_TYPES = ["Dog", "Cat", "Cow", "Bird", "Other"];

export default function AddAnimalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    animalType: "Dog",
    urgency: "medium",
    condition: "",
    location: "",
    date: "",
    contactInfo: user?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to report an animal");
    setLoading(true);
    try {
      await api.post("/animals", {
        ...formData,
        image: images[0] || "",
      });
      toast.success("Animal report submitted successfully!");
      router.push("/animals");
    } catch (err) {
      toast.error(errMsg(err, "Failed to submit animal report"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#050907]">
      <div className="relative pt-16 pb-12 px-[5%] bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">Help an Animal in Need</h1>
          <p className="text-emerald-100 text-[13px] max-w-xl">
            Report stray animals that need medical attention, shelter, or food. Every report can save a life.
          </p>
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#0a120e] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Animal Type</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {ANIMAL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, animalType: t })}
                    className={`py-3 rounded-xl border-2 font-bold text-xs cursor-pointer ${
                      formData.animalType === t
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-slate-200 dark:border-[#1e3040] text-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Urgency Level</label>
              <div className="flex bg-slate-100 dark:bg-[#1e3040] p-1 rounded-xl gap-1">
                {["low", "medium", "high", "emergency"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: lvl })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize cursor-pointer ${
                      formData.urgency === lvl ? "bg-white dark:bg-[#0a120e] text-teal-600 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Condition Description *</label>
              <textarea
                required
                rows={4}
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="Describe the animal's condition, appearance, and what kind of help is needed..."
                className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-lg px-4 py-3 text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Precise location or landmark"
                  className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Date Spotted *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Photo (Optional)</label>
              <ImageUploader value={images} onChange={setImages} max={1} />
            </div>

            <div className="pt-4 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push("/animals")}
                className="px-6 py-3 font-bold text-slate-500 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg cursor-pointer"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

