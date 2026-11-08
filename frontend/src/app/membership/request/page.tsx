"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { MinimalLoader } from "../../../components/ui";

export default function MembershipRequestPage() {
  const { user, dbUser, refreshProfile } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: dbUser?.name || user?.displayName || "",
    phone: dbUser?.phone || "+880",
    area: dbUser?.area || "",
    streetAddress: dbUser?.streetAddress || "",
    apartmentNumber: dbUser?.apartmentNumber || "",
    nid: "",
    intro: "",
    idImage: "",
  });

  useEffect(() => {
    api
      .get("/membership/status", { fresh: true })
      .then((res) => setStatus(res.data?.status || "none"))
      .catch(() => setStatus("none"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in first");
    setSubmitting(true);
    try {
      await api.post("/membership/request", formData);
      setStatus("pending");
      await refreshProfile();
      toast.success("Membership verification request submitted successfully!");
    } catch (err) {
      toast.error(errMsg(err, "Failed to submit request."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <MinimalLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#050907] pt-16 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="bg-white dark:bg-[#0a120e] rounded-[2rem] shadow-xl border border-slate-100 dark:border-[#1e3040] p-6 md:p-10 relative">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/30 rounded-lg flex items-center justify-center mx-auto mb-6 border border-teal-100 text-[#0f766e]">
            <i className="ri-shield-user-line text-3xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white text-center mb-2">Verified Membership</h1>
          <p className="text-slate-500 dark:text-slate-300 text-center text-[13px] mb-8 max-w-md mx-auto">
            Verify your residency to unlock unlimited posting, organize cleanup drives, and join community governance.
          </p>

          {status === "pending" ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-6 text-center">
              <h3 className="font-bold text-amber-800 dark:text-amber-300 text-base mb-2">
                <i className="ri-time-line animate-pulse mr-1"></i> Verification Request Pending
              </h3>
              <p className="text-amber-700 dark:text-amber-400 text-xs max-w-sm mx-auto">
                Your residency details are currently under review by our community admins.
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 px-6 py-2.5 bg-amber-100 text-amber-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Return Home
              </button>
            </div>
          ) : status === "approved" || dbUser?.role === "member" || dbUser?.role === "admin" ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-6 text-center">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-base mb-2">
                <i className="ri-checkbox-circle-line mr-1"></i> You are a Verified Member!
              </h3>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs max-w-sm mx-auto">
                Your residency is verified and you have full member access.
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 px-6 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Return Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Neighborhood / Area</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g. Dhanmondi, Ward 15"
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Street Address / Road</label>
                  <input
                    type="text"
                    required
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    placeholder="e.g. Road 8A, Block B"
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Apartment / House Number</label>
                  <input
                    type="text"
                    required
                    value={formData.apartmentNumber}
                    onChange={(e) => setFormData({ ...formData, apartmentNumber: e.target.value })}
                    placeholder="e.g. Flat 4B, House 12"
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">NID / Passport Number</label>
                  <input
                    type="text"
                    required
                    value={formData.nid}
                    onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                    placeholder="e.g. 1992837192"
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                  Utility Bill / Residency Proof Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.idImage}
                  onChange={(e) => setFormData({ ...formData, idImage: e.target.value })}
                  placeholder="https://example.com/my-utility-bill.jpg"
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Why are you joining? (Introduction)</label>
                <textarea
                  required
                  rows={3}
                  value={formData.intro}
                  onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                  placeholder="Tell us why you would like to join as a verified resident member..."
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-1/3 bg-slate-100 dark:bg-[#1e3040] text-slate-700 dark:text-[#cbd5e1] py-3.5 rounded-xl font-bold text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase shadow-lg cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit Verification Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

