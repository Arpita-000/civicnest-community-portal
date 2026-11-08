"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton } from "../../../components/ui";
import ImageUploader from "../../../components/ImageUploader";

const CATEGORY_GRID = [
  { value: "pets", label: "Pets", icon: "ri-bear-smile-line" },
  { value: "electronics", label: "Electronics", icon: "ri-smartphone-line" },
  { value: "documents", label: "Documents", icon: "ri-file-text-line" },
  { value: "keys", label: "Keys", icon: "ri-key-2-line" },
  { value: "clothing", label: "Clothing", icon: "ri-t-shirt-line" },
  { value: "other", label: "Other", icon: "ri-archive-line" },
];

function LostFoundForm({ initialType }: { initialType: "lost" | "found" }) {
  const router = useRouter();
  const { user } = useAuth();
  const [type, setType] = useState<"lost" | "found">(initialType);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    category: "pets",
    itemName: "",
    description: "",
    location: "",
    dateLostFound: "",
    reward: 0,
    contactInfo: user?.email || "",
  });

  const isLost = type === "lost";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to post a listing");
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await api.post("/lost-found", {
        ...formData,
        type,
        image: images[0] || "",
        reward: isLost ? Number(formData.reward) || 0 : 0,
        expiresAt: expiresAt.toISOString(),
        status: "open",
      });
      toast.success(isLost ? "Lost item reported successfully!" : "Found item reported successfully!");
      router.push(`/lost-found?type=${type}`);
    } catch (err) {
      toast.error(errMsg(err, "Failed to submit listing"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050907]">
      <div
        className={`relative pt-16 pb-12 px-[5%] ${
          isLost
            ? "bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900"
            : "bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900"
        }`}
      >
        <div className="relative z-10 max-w-7xl mx-auto text-white">
          <div className="mb-4">
            <BackButton variant="light" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            {isLost ? "Help Me Find It" : "Help Reunite This Item"}
          </h1>
          <p className="text-white/80 text-[13px] max-w-2xl">
            {isLost
              ? "Report lost items to get community assistance finding them."
              : "Found something? Help reunite it with its owner by reporting it here."}
          </p>
        </div>
      </div>

      <div className="px-[5%] py-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#0a120e] rounded-xl shadow-sm border border-slate-200 dark:border-[#1e3040] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Listing Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("lost")}
                  className={`py-3.5 rounded-xl font-bold text-[13px] border-2 cursor-pointer ${
                    isLost ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 dark:border-[#1e3040] text-slate-400"
                  }`}
                >
                  😟 I Lost This
                </button>
                <button
                  type="button"
                  onClick={() => setType("found")}
                  className={`py-3.5 rounded-xl font-bold text-[13px] border-2 cursor-pointer ${
                    !isLost ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 dark:border-[#1e3040] text-slate-400"
                  }`}
                >
                  🎁 I Found This
                </button>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Category</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {CATEGORY_GRID.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 cursor-pointer ${
                      formData.category === cat.value
                        ? isLost
                          ? "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 dark:border-[#1e3040] text-slate-500"
                    }`}
                  >
                    <i className={`${cat.icon} text-lg`} />
                    <span className="text-xs font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Item Name *</label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="e.g. Golden Retriever, iPhone 13, Black Wallet..."
                className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Description *</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide distinct features, color, brand, or any helpful details..."
                className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
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
                  placeholder="e.g. Dhanmondi Lake near Gate 3"
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dateLostFound}
                  onChange={(e) => setFormData({ ...formData, dateLostFound: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {isLost && (
              <div>
                <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Cash Reward (Optional ৳)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] block mb-2">Item Photo (Optional)</label>
              <ImageUploader value={images} onChange={setImages} max={1} />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push("/lost-found")}
                className="px-6 py-3 font-bold text-slate-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg cursor-pointer ${
                  isLost ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loading ? "Submitting..." : "Post Listing"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AddLostPage() {
  return <LostFoundForm initialType="lost" />;
}

