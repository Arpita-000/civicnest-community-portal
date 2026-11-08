"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function NGOProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ngo, setNgo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(500);
  const [donating, setDonating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/ngos/${id}`, { fresh: true })
      .then((res) => setNgo(res.data))
      .catch(() => setNgo(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDonate = async () => {
    if (!user) return toast.error("Please log in to make a donation");
    if (!amount || amount < 50) return toast.error("Minimum donation is ৳50");
    setDonating(true);
    try {
      await api.post("/ngos/donate", { ngoId: id, amount: Number(amount) });
      toast.success(`Thank you for supporting ${ngo.name} with ৳${amount}!`);
    } catch (err) {
      toast.error(errMsg(err, "Donation failed"));
    } finally {
      setDonating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <MinimalLoader />
      </div>
    );
  }

  if (!ngo) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-[#cbd5e1]">NGO Not Found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#050907]">
      <div className="relative pt-16 pb-16 px-[5%] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden border-4 border-white/20 shadow-xl shrink-0 bg-white">
              <img
                src={ngo.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(ngo.name)}&background=0d9488&color=fff`}
                alt={ngo.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes("ui-avatars")) {
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ngo.name)}&background=0d9488&color=fff`;
                  }
                }}
              />
            </div>

            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-400/20 text-emerald-200 mb-2">
                {ngo.status === "verified" ? "✓ Verified NGO" : "Community Partner"}
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3">{ngo.name}</h1>
              <p className="text-white/80 text-sm max-w-2xl">{ngo.mission}</p>

              <div className="flex flex-wrap gap-3 mt-5 text-xs">
                {ngo.contactEmail && (
                  <span className="bg-white/10 px-4 py-2 rounded-full">
                    <i className="ri-mail-line mr-1.5" />
                    {ngo.contactEmail}
                  </span>
                )}
                {ngo.phone && (
                  <span className="bg-white/10 px-4 py-2 rounded-full">
                    <i className="ri-phone-line mr-1.5" />
                    {ngo.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0a120e] rounded-xl p-6 border border-slate-200 dark:border-[#1e3040]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">About This NGO</h2>
            <p className="text-sm text-slate-700 dark:text-[#cbd5e1] leading-relaxed">{ngo.mission}</p>
          </div>

          <div className="bg-white dark:bg-[#0a120e] rounded-xl p-6 border border-slate-200 dark:border-[#1e3040]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Focus Areas</h2>
            <div className="flex flex-wrap gap-2">
              {(ngo.focusAreas || []).map((area: string, i: number) => (
                <span key={i} className="px-4 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-full text-xs font-semibold">
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-teal-200 dark:border-teal-800/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-teal-900 dark:text-teal-200 font-bold text-base mb-1">Support This NGO</h3>
              <p className="text-teal-800/80 dark:text-teal-300/80 text-xs">
                Your contribution helps them continue their community work.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-32 px-4 py-2.5 bg-white dark:bg-[#0a120e] border border-teal-300 rounded-xl text-sm font-bold"
              />
              <button
                onClick={handleDonate}
                disabled={donating}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                {donating ? "Processing..." : `Donate ৳${amount}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

