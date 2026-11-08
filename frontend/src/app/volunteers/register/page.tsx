"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api, { errMsg } from "../../../lib/api";
import { BackButton } from "../../../components/ui";

const SKILLS_LIST = [
  { id: "medical", label: "Medical First Aid", icon: "ri-nurse-line", color: "text-rose-500 bg-rose-50 border-rose-200" },
  { id: "plumbing", label: "Plumbing", icon: "ri-tools-line", color: "text-blue-500 bg-blue-50 border-blue-200" },
  { id: "electrical", label: "Electrical", icon: "ri-flashlight-line", color: "text-amber-500 bg-amber-50 border-amber-200" },
  { id: "driving", label: "Driving/Transport", icon: "ri-steering-2-line", color: "text-purple-500 bg-purple-50 border-purple-200" },
  { id: "teaching", label: "Teaching", icon: "ri-book-open-line", color: "text-cyan-500 bg-cyan-50 border-cyan-200" },
  { id: "cleanup", label: "General Cleanup", icon: "ri-leaf-line", color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { id: "animal_care", label: "Animal Care", icon: "ri-bear-smile-line", color: "text-orange-500 bg-orange-50 border-orange-200" },
];

const AVAILABILITY_OPTS = [
  { id: "Weekdays", label: "Weekdays", icon: "ri-calendar-event-line" },
  { id: "Weekends", label: "Weekends", icon: "ri-calendar-check-line" },
  { id: "Anytime", label: "Anytime", icon: "ri-24-hours-line" },
];

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    availability: "Anytime",
    area: "",
    phone: "+880",
    contactMethod: "Email",
  });

  const toggleSkill = (skillLabel: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillLabel)
        ? prev.skills.filter((s) => s !== skillLabel)
        : [...prev.skills, skillLabel],
    }));
  };

  const handleNext = () => {
    if (step === 1 && formData.skills.length === 0) {
      toast.error("Please select at least one skill.");
      return;
    }
    if (step === 2 && !formData.area) {
      toast.error("Please specify your primary area.");
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactMethod) {
      toast.error("Please select a preferred contact method.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/volunteers/register", formData);
      toast.success("Volunteer registration submitted!");
      router.push("/volunteers");
    } catch (err) {
      toast.error(errMsg(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ecf7f4] dark:bg-[#050907] pt-16 pb-20 px-[5%]">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <BackButton variant="dark" />
        </div>

        <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg shadow-xl border border-slate-100 dark:border-[#1e3040] overflow-hidden">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-600 p-6 text-white text-center">
            <h1 className="text-3xl font-extrabold mb-2">Join as a Volunteer</h1>
            <p className="text-white/80">Make a real difference in your community.</p>

            <div className="flex items-center justify-center gap-2 mt-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? "w-12 bg-white" : "w-4 bg-white/30"}`}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">What skills can you offer?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {SKILLS_LIST.map((skill) => {
                      const isSelected = formData.skills.includes(skill.label);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.label)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                            isSelected ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30" : "border-slate-100 dark:border-[#1e3040] hover:border-teal-200"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] ${skill.color}`}>
                            <i className={skill.icon} />
                          </div>
                          <span className={`font-semibold ${isSelected ? "text-teal-700 dark:text-teal-300" : "text-slate-600 dark:text-slate-300"}`}>
                            {skill.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleNext} className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700">
                      Next Step →
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Where &amp; When?</h3>
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1] mb-3">Primary Area (Required)</label>
                      <input
                        type="text"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder="e.g. Mirpur, Dhanmondi..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl text-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1] mb-3">General Availability</label>
                      <div className="grid grid-cols-3 gap-3">
                        {AVAILABILITY_OPTS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, availability: opt.id })}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                              formData.availability === opt.id
                                ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                                : "border-slate-100 dark:border-[#1e3040] text-slate-500"
                            }`}
                          >
                            <i className={`${opt.icon} text-2xl mb-1`} />
                            <span className="text-[13px] font-semibold">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 rounded-xl font-semibold">
                      ← Back
                    </button>
                    <button onClick={handleNext} className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700">
                      Next Step →
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Contact Details</h3>
                  <form onSubmit={handleSubmit} className="space-y-6 mb-8">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1] mb-3">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+880 1..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] rounded-xl text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1] mb-3">Preferred Contact Method</label>
                      <div className="flex gap-4">
                        {["Email", "Phone", "WhatsApp"].map((method) => (
                          <label key={method} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="contactMethod"
                              value={method}
                              checked={formData.contactMethod === method}
                              onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                            />
                            <span className="text-slate-700 dark:text-[#cbd5e1] font-medium">{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </form>

                  <div className="flex justify-between">
                    <button onClick={() => setStep(2)} className="px-6 py-3 text-slate-500 rounded-xl font-semibold">
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50"
                    >
                      {loading ? "Registering..." : "Complete Registration"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

