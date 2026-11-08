"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { BackButton } from "../../../components/ui";

export default function NGORegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mission: "",
    contactEmail: "",
    website: "",
    phone: "",
    logoUrl: "",
    focusAreas: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/ngos", formData);
      toast.success("NGO Registration submitted! Pending admin approval.");
      router.push("/ngos");
    } catch (err) {
      toast.error(errMsg(err, "Registration failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#050907]">
      <div className="relative pt-16 pb-12 px-[5%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Register Your NGO</h1>
          <p className="text-white/80 text-[13px] max-w-2xl">
            Join the CivicNest network. All applications are reviewed by our community admins.
          </p>
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#0a120e] p-6 md:p-10 rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Organization Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                placeholder="e.g. Green Earth Initiative"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mission Statement *</label>
              <textarea
                required
                rows={4}
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                placeholder="What does your organization strive to achieve?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Contact Email *</label>
                <input
                  required
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                  placeholder="hello@ngo.org"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Website URL (Optional)</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                placeholder="https://"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Logo Image URL</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Focus Areas</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { value: "environment", label: "Environment 🌿" },
                  { value: "education", label: "Education 📚" },
                  { value: "health", label: "Health 🏥" },
                  { value: "animals", label: "Animals 🐾" },
                  { value: "community", label: "Community 👥" },
                ].map((area) => {
                  const isSelected = formData.focusAreas.includes(area.value);
                  return (
                    <button
                      key={area.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          focusAreas: isSelected
                            ? prev.focusAreas.filter((a) => a !== area.value)
                            : [...prev.focusAreas, area.value],
                        }))
                      }
                      className={`px-4 py-3 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                        isSelected
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215] text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {area.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-md cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

