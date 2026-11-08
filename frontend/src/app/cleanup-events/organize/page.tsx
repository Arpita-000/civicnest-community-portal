"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { BackButton } from "../../../components/ui";

export default function OrganizeEventPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slogan, setSlogan] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("09:00");
  const [durationHours, setDurationHours] = useState(3);
  const [maxVolunteers, setMaxVolunteers] = useState(0);
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [meetingInstructions, setMeetingInstructions] = useState("");
  const [lat, setLat] = useState(23.8103);
  const [lng, setLng] = useState(90.4125);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [suppliesNeeded, setSuppliesNeeded] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [supplyInput, setSupplyInput] = useState("");
  const [fundingEnabled, setFundingEnabled] = useState(false);
  const [fundingGoal, setFundingGoal] = useState(5000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEligible = !!user;

  const addTag = (type: "skill" | "supply") => {
    if (type === "skill" && skillInput.trim()) {
      setRequiredSkills([...requiredSkills, skillInput.trim()]);
      setSkillInput("");
    } else if (type === "supply" && supplyInput.trim()) {
      setSuppliesNeeded([...suppliesNeeded, supplyInput.trim()]);
      setSupplyInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !eventDate || !address.trim()) {
      return toast.error("Please fill in all required fields.");
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title,
        slogan,
        description,
        eventDate,
        eventTime,
        durationHours: Number(durationHours) || 3,
        maxVolunteers: Number(maxVolunteers) || 0,
        meetingInstructions,
        location: {
          address,
          area: area || "Dhaka",
          coordinates: [lng, lat],
        },
        requiredSkills,
        suppliesNeeded,
        fundingEnabled,
        fundingGoal: fundingEnabled ? Number(fundingGoal) || 5000 : 0,
        coverImages: [
          coverImage || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&q=80&w=1200",
        ],
      };
      await api.post("/cleanup-events", payload);
      toast.success("Cleanup Drive submitted successfully!");
      router.push("/cleanup-events");
    } catch (err) {
      toast.error(errMsg(err, "Failed to create event"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-[5%] mb-8">
        <BackButton variant="dark" className="mb-6" />

        <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0f2e28] via-[#1a4a42] to-[#0d2a23] shadow-2xl p-10">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-teal-300 text-xs font-bold tracking-widest uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                Official Application
              </div>
              <h1 className="text-3xl md:text-5xl text-white font-black tracking-tight leading-tight">
                Organize a{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-200">
                  Community Drive
                </span>
              </h1>
              <p className="text-teal-100/80 mt-3 text-[13px] font-medium leading-relaxed">
                Step up and lead your neighborhood. Submit a proposal to receive verified status, funding tools, and volunteer matchmaking.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-[5%]">
        {authLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : !isEligible ? (
          <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-xl p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Sign In Required</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto">
              Please sign in to organize a community cleanup drive. Any unused guest credits or member privileges will be applied automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="px-8 py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-sm">
                Sign In
              </Link>
              <BackButton variant="dark" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-xl p-5 space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#14241d] pb-4">
                Basic Details
              </h2>
              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Event Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  placeholder="e.g. Mirpur Sector 7 Mega Cleanup"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Slogan</label>
                <input
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  placeholder="e.g. Let's make Mirpur green again!"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-4 h-32 text-slate-800 dark:text-white"
                  placeholder="Describe what you plan to achieve..."
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Event Banner / Poster URL</label>
                <input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  placeholder="https://example.com/poster.jpg (Optional)"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-xl p-5 space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Schedule &amp; Logistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Event Date *</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Event Time *</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Duration (Hours)</label>
                  <input
                    type="number"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Max Volunteers (0 for unlimited)</label>
                  <input
                    type="number"
                    value={maxVolunteers}
                    onChange={(e) => setMaxVolunteers(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-xl p-5 space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Location Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Full Address *</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                    placeholder="Street address or prominent landmark"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">General Area / Ward</label>
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white"
                    placeholder="e.g. Mirpur"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Meeting Instructions</label>
                <textarea
                  value={meetingInstructions}
                  onChange={(e) => setMeetingInstructions(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-4 h-24 text-slate-800 dark:text-white"
                  placeholder="e.g. Meet by the south gate of the park"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-xl p-5 space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Skills &amp; Supplies</h2>
              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Required Skills</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("skill"))}
                    className="flex-1 bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-2 text-[13px] text-slate-800 dark:text-white"
                    placeholder="e.g. Photography, First Aid"
                  />
                  <button type="button" onClick={() => addTag("skill")} className="px-5 bg-teal-600 text-white rounded-lg text-[13px] font-bold">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-teal-50 text-teal-700 text-xs rounded-full flex items-center gap-2 border border-teal-200">
                      {tag}
                      <button type="button" onClick={() => setRequiredSkills(requiredSkills.filter((_, idx) => idx !== i))}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Supplies Needed</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={supplyInput}
                    onChange={(e) => setSupplyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("supply"))}
                    className="flex-1 bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-2 text-[13px] text-slate-800 dark:text-white"
                    placeholder="e.g. Gloves, Trash Bags"
                  />
                  <button type="button" onClick={() => addTag("supply")} className="px-5 bg-teal-600 text-white rounded-lg text-[13px] font-bold">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suppliesNeeded.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-violet-100 text-violet-700 text-xs rounded-full flex items-center gap-2 border border-violet-200">
                      {tag}
                      <button type="button" onClick={() => setSuppliesNeeded(suppliesNeeded.filter((_, idx) => idx !== i))}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040] rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Accept Donations for Supplies</h2>
                  <p className="text-xs text-slate-500">Enable crowdfunding to help cover event expenses</p>
                </div>
                <input
                  type="checkbox"
                  checked={fundingEnabled}
                  onChange={(e) => setFundingEnabled(e.target.checked)}
                  className="toggle toggle-success"
                />
              </div>
              {fundingEnabled && (
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-white mb-2">Target Funding Goal (৳)</label>
                  <input
                    type="number"
                    value={fundingGoal}
                    onChange={(e) => setFundingGoal(Number(e.target.value))}
                    className="w-full md:w-1/2 bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-lg p-3 text-slate-800 dark:text-white font-bold"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 bg-teal-600 text-white rounded-full font-bold text-[13px] hover:bg-teal-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Submitting..." : "Submit Cleanup Drive for Review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

