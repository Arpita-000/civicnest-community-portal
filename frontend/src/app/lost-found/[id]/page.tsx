"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function LostFoundDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [statement, setStatement] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadItem = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/lost-found/${id}`, { fresh: true })
      .then((res) => setItem(res.data))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#050907]">
        <MinimalLoader />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#050907]">
        <div className="text-center">
          <p className="text-base font-bold text-slate-700 dark:text-[#cbd5e1]">Item not found.</p>
          <Link href="/lost-found" className="mt-4 inline-block text-teal-600 font-bold hover:underline">
            Back to Lost &amp; Found
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.email && (user.email === item.reporter || user.email === item.postedBy);
  const isLost = item.type === "lost";

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in first");
    if (!statement.trim()) return toast.error("Please enter a description/statement.");
    setSubmitting(true);
    try {
      const endpoint = isLost ? `/lost-found/${id}/found-report` : `/lost-found/${id}/claim`;
      await api.post(endpoint, { statement, contactPhone });
      toast.success(isLost ? "Sighting report submitted!" : "Ownership claim submitted!");
      setShowClaimForm(false);
      setStatement("");
      loadItem();
    } catch (err) {
      toast.error(errMsg(err, "Failed to submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReunite = async (finderEmail?: string, claimantEmail?: string) => {
    try {
      await api.post(`/lost-found/${id}/reunite`, { finderEmail, claimantEmail });
      toast.success("Item marked as reunited!");
      loadItem();
    } catch (err) {
      toast.error(errMsg(err, "Failed to mark reunited"));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050907] pt-12 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <BackButton variant="dark" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#0a120e] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040] overflow-hidden">
              <div className="h-64 md:h-96 w-full relative bg-slate-100 dark:bg-[#1e3040]">
                {item.image ? (
                  <img src={item.image} alt={item.itemName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">No Photo Provided</div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white ${
                      isLost ? "bg-rose-500" : "bg-emerald-600"
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.status !== "open" && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-slate-700 text-white">
                      {item.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-10">
                <div className="flex flex-wrap gap-2.5 mb-4">
                  <span className="bg-slate-100 dark:bg-[#1e3040] text-slate-600 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize">
                    Category: {item.category}
                  </span>
                  <span className="bg-slate-100 dark:bg-[#1e3040] text-slate-600 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                    Date: {item.dateLostFound || item.date || "Recent"}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white mb-6">{item.itemName}</h1>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[14px] whitespace-pre-line">{item.description}</p>

                {isLost && item.reward > 0 && (
                  <div className="mt-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase">Cash Reward Offered</span>
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-300">৳{item.reward}</span>
                  </div>
                )}

                {item.status === "open" && !isOwner && !showClaimForm && (
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#14241d]">
                    <button
                      onClick={() => setShowClaimForm(true)}
                      className={`w-full text-white py-4 rounded-xl font-bold shadow-lg cursor-pointer ${
                        isLost ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isLost ? "I found this item" : "I think this is mine"}
                    </button>
                  </div>
                )}

                {showClaimForm && (
                  <form onSubmit={handleSubmitClaim} className="mt-8 pt-6 border-t border-slate-100 dark:border-[#14241d] space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-white">
                      {isLost ? "Submit Sighting / Found Report" : "Claim Ownership of Item"}
                    </h3>
                    <textarea
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      required
                      rows={3}
                      placeholder={
                        isLost
                          ? "Describe where you spotted or secured this item..."
                          : "Provide specific details that prove your ownership..."
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215]"
                    />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Contact Phone (Optional)"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#1e3040] bg-slate-50 dark:bg-[#0b1215]"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowClaimForm(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                        Cancel
                      </button>
                      <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl">
                        {submitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </form>
                )}

                {isOwner && item.status !== "reunited" && (
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-[#1e3040] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 dark:text-white">
                        {isLost ? "Sighting / Finder Reports" : "Ownership Claims"}
                      </h3>
                      <button
                        onClick={() => handleReunite()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs cursor-pointer"
                      >
                        Mark as Reunited
                      </button>
                    </div>
                    {((isLost ? item.foundReports : item.claims) || []).map((sub: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-white">{sub.name || sub.email}</span>
                          <span className="text-slate-400">{sub.contactPhone}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic">&ldquo;{sub.statement}&rdquo;</p>
                        <button
                          onClick={() => handleReunite(isLost ? sub.email : undefined, !isLost ? sub.email : undefined)}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                        >
                          Accept &amp; Close Listing
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0a120e] rounded-xl p-5 shadow-sm border border-slate-200 dark:border-[#1e3040] space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Location &amp; Reporter</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                <i className="ri-map-pin-line mr-1 text-teal-600" />
                {item.location}
              </p>
              <p className="text-xs text-slate-500">
                Posted by: <strong className="text-slate-800 dark:text-white">{item.reporterDetails?.name || item.contactInfo || "Citizen"}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

