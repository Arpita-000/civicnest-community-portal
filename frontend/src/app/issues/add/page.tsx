"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, EyeOff, HandCoins, ImagePlus, MapPin, Send, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import api, { errMsg } from "../../../lib/api";
import { BackButton, PremiumDropdown } from "../../../components/ui";
import ImageUploader from "../../../components/ImageUploader";

const CATEGORIES = ["Garbage & Waste", "Road Damage", "Waterlogging", "Illegal Construction", "Broken Public Property", "Utility Problems", "Social Problems", "Environmental Issues", "Safety & Crime", "Community Norms", "Custom"];

const inputCls =
  "w-full h-12 px-4 rounded-lg bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] focus:bg-white dark:focus:bg-[#0a120e] focus:ring-2 focus:ring-[#9FE2BF]/40 focus:border-[#40826D] transition-all outline-none text-slate-800 dark:text-white placeholder-slate-400";

type Errors = Partial<Record<"title" | "category" | "customFlair" | "description" | "location" | "incidentDate" | "images" | "goal" | "purpose", string>>;

const isoDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function Toggle({ checked, onChange, disabled, activeColor = "bg-[#40826D]", label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; activeColor?: string; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9FE2BF]/50 focus:ring-offset-2 ${checked ? activeColor : "bg-slate-200 dark:bg-[#1e3040]"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span className={`pointer-events-none relative flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-300 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function CreditCard({ data }: { data: any }) {
  if (!data || data.isAdmin || data.limit == null) return null;
  const { limit, remaining } = data;
  const depleted = remaining === 0;
  const warning = remaining === 1;
  const surplus = remaining > limit;

  let card = "bg-gradient-to-br from-emerald-50/70 via-white/80 to-teal-50/50 dark:from-emerald-950/20 dark:via-[#0a120e] dark:to-teal-950/10 border-emerald-100/80 dark:border-emerald-900/40 shadow-md shadow-emerald-100/20";
  let title = "text-emerald-950 dark:text-emerald-100 font-extrabold";
  let sub = "text-emerald-700 dark:text-emerald-300 font-medium";
  let ping = "bg-emerald-400";
  let color = "#10b981";
  let Icon = ShieldCheck;
  if (surplus) {
    card = "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 border-amber-200/60 shadow-lg shadow-amber-200/20";
    title = "text-amber-950 dark:text-amber-100 font-black";
    sub = "text-amber-800 dark:text-amber-300 font-semibold";
    ping = "bg-amber-400";
    color = "#f59e0b";
    Icon = Sparkles;
  } else if (warning) {
    card = "bg-gradient-to-br from-amber-50/70 via-white/80 to-yellow-50/50 dark:from-amber-950/20 dark:via-[#0a120e] dark:to-yellow-950/10 border-amber-200/80 dark:border-amber-900/40 shadow-md shadow-amber-100/20";
    title = "text-amber-950 dark:text-amber-100 font-extrabold";
    sub = "text-amber-700 dark:text-amber-300 font-medium";
    ping = "bg-amber-400";
    color = "#f59e0b";
  } else if (depleted) {
    card = "bg-gradient-to-br from-rose-50/70 via-white/80 to-red-50/50 dark:from-rose-950/20 dark:via-[#0a120e] dark:to-red-950/10 border-rose-100/80 dark:border-rose-900/40 shadow-md shadow-rose-100/20";
    title = "text-rose-950 dark:text-rose-100 font-extrabold";
    sub = "text-rose-700 dark:text-rose-300 font-medium";
    ping = "bg-rose-400";
    color = "#f43f5e";
    Icon = ShieldAlert;
  }

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(remaining, limit) / Math.max(limit, 1);
  const wait = data.hoursLeft != null ? `${data.hoursLeft}h ${data.minutesLeft || 0}m` : "up to 72 hours";

  return (
    <div className={`p-4 rounded-xl border mb-8 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 ${card}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
        <div className="relative flex-shrink-0">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-lg bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-100 dark:border-[#14241d] shadow-sm">
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ping}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${depleted ? "bg-rose-500" : warning ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            </span>
            <Icon className={`w-7 h-7 ${surplus ? "text-amber-500 animate-pulse" : depleted ? "text-rose-500" : "text-emerald-600"}`} />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className={`text-[13px] tracking-tight ${title}`}>{depleted ? "Posting Limit Reached" : surplus ? "Premium Surplus Active" : "Posting Credits Available"}</h3>
          <p className={`text-[13px] max-w-lg leading-relaxed ${sub}`}>
            {depleted
              ? `You have 0 posting credits remaining. Your next credit will recover in approximately ${wait}.`
              : surplus
              ? `Boosted Status: You have ${remaining} of ${limit} credits! Earned via volunteer points.`
              : `You have ${remaining} of ${limit} issue posting credits in every rolling 72 hours. This protects the platform from spam.`}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-full shadow-inner border border-slate-100/60 dark:border-[#14241d]">
          <svg className="w-[4.5rem] h-[4.5rem]" viewBox="0 0 72 72">
            <g transform="rotate(-90 36 36)">
              <circle cx="36" cy="36" r={radius} className="stroke-slate-100 dark:stroke-[#14241d] fill-none" strokeWidth={5} />
              <circle cx="36" cy="36" r={radius} className="fill-none transition-all duration-1000 ease-out" strokeWidth={5} strokeDasharray={circumference} strokeDashoffset={circumference - ratio * circumference} stroke={color} strokeLinecap="round" />
            </g>
          </svg>
          <div className="absolute text-center select-none">
            <span className={`block text-2xl font-black tracking-tighter ${surplus ? "text-amber-500" : depleted ? "text-rose-500" : "text-slate-800 dark:text-white"}`}>{remaining}</span>
            <span className="block text-[8px] font-bold text-slate-400 tracking-wider uppercase -mt-1">{remaining === 1 ? "Credit" : "Credits"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] p-4 md:p-5 rounded-lg shadow-sm border border-slate-200 dark:border-[#1e3040] space-y-6">
      <h2 className="text-[13px] tracking-tight font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#14241d] pb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

const Err = ({ msg }: { msg?: string }) => (msg ? <p className="text-[13px] text-red-500" role="alert">{msg}</p> : null);

export default function AddIssuePage() {
  const router = useRouter();
  const { user, dbUser, isMember, loading } = useAuth();

  const [form, setForm] = useState({ title: "", category: "", customFlair: "", description: "", location: "", area: "", incidentDate: "", isAnonymous: false, enableCrowdfunding: false, goal: "", purpose: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [credits, setCredits] = useState<any>(null);

  const today = useMemo(() => new Date(), []);
  const set = (k: keyof typeof form, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to report an incident.");
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.get("/credits/issues", { fresh: true }).then((r) => setCredits(r.data)).catch(() => {});
  }, [user]);

  const findMe = () => {
    if (!("geolocation" in navigator)) return toast.error("Your browser does not support GPS.");
    toast.loading("Finding your location...", { id: "gps" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data?.display_name) set("location", data.display_name);
        } catch {}
        toast.success("Location found!", { id: "gps" });
      },
      (err) => toast.error(err.code === 1 ? "Location permission denied." : err.code === 3 ? "Location request timed out." : "Could not access GPS.", { id: "gps" }),
      { timeout: 15000, maximumAge: 10000 }
    );
  };

  const validate = (): Errors => {
    const e: Errors = {};
    const title = form.title.trim();
    if (!title) e.title = "Title is required";
    else if (title.length < 10) e.title = "Minimum 10 characters required";
    else if (title.length > 120) e.title = "Maximum 120 characters allowed";
    else if (title === title.toUpperCase() && /[A-Z]/.test(title)) e.title = "Title must not be all-caps";
    if (!form.category) e.category = "Please select a category";
    if (form.category === "Custom") {
      const words = form.customFlair.trim().split(/\s+/).filter(Boolean).length;
      if (!words) e.customFlair = "Custom flair is required";
      else if (words > 7) e.customFlair = "Custom flair must be 1 to 7 words";
    }
    const desc = form.description.trim();
    if (!desc) e.description = "Description is required";
    else if (desc.length < 30) e.description = "Minimum 30 characters required";
    else if (desc.length > 2000) e.description = "Maximum 2000 characters allowed";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.incidentDate) e.incidentDate = "Date is required";
    if (images.length === 0) e.images = "Please upload at least one photo as evidence.";
    if (form.enableCrowdfunding) {
      const goal = Number(form.goal);
      if (!form.goal) e.goal = "Goal is required";
      else if (goal < 100) e.goal = "Minimum 100 BDT";
      else if (goal > 500000) e.goal = "Maximum 500,000 BDT";
      if (!form.purpose.trim()) e.purpose = "Purpose is required";
    }
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0] as string);
      return;
    }
    if (uploading > 0) return toast.error("Please wait for your photos to finish uploading.");

    setSubmitting(true);
    toast.loading("Submitting issue report...", { id: "submitIssue" });
    try {
      const res = await api.post("/issues", {
        title: form.title.trim(),
        category: form.category,
        customFlair: form.category === "Custom" ? form.customFlair.trim() : null,
        description: form.description.trim(),
        location: form.location.trim(),
        area: form.area.trim() || "General Area",
        incidentDate: new Date(form.incidentDate + "T12:00:00").toISOString(),
        images,
        coordinates: coords ?? { lat: null, lng: null },
        isAnonymous: form.isAnonymous && isMember,
        crowdfunding: { enabled: form.enableCrowdfunding, targetAmount: form.enableCrowdfunding ? Number(form.goal) : null, purpose: form.enableCrowdfunding ? form.purpose.trim() : null },
      });
      toast.success(res.data.approvalStatus === "approved" ? "Issue published!" : "Issue submitted! It will appear in the feed once an admin approves it.", { id: "submitIssue", duration: 5000 });
      router.push("/issues/my");
    } catch (err) {
      toast.error(errMsg(err, "Failed to add issue. Please try again."), { id: "submitIssue", duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  const noCredits = credits && !credits.isAdmin && credits.remaining === 0;
  const guestBlocked = credits && !credits.isAdmin && credits.limit === 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050a08] py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-slate-200">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <BackButton variant="dark" />
          {credits && !credits.isAdmin && credits.limit != null && (
            <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${noCredits ? "bg-rose-50/60 border-rose-200 text-rose-700" : "bg-emerald-50/60 border-emerald-200 text-emerald-700"}`}>
              <div className="flex gap-1">
                {Array.from({ length: Math.max(credits.limit, credits.remaining) }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-1.5 rounded-full ${i < credits.remaining ? (noCredits ? "bg-rose-500" : "bg-emerald-500") : "bg-slate-200"}`} />
                ))}
              </div>
              {noCredits ? "Depleted" : `${credits.remaining}/${credits.limit} remaining`}
            </div>
          )}
        </div>

        {/* Banner */}
        <div className="relative rounded-lg overflow-hidden shadow-lg mb-10 group">
          <div className="absolute inset-0 bg-slate-800 bg-[url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=70')] bg-cover bg-center bg-no-repeat"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/75 via-slate-900/40 to-transparent z-10"></div>
          <div className="relative z-20 px-6 pt-12 pb-10 md:pt-14 md:pb-12 md:px-10 text-white">
            <div className="max-w-2xl mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#9FE2BF]/20 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
                  <ShieldCheck className="w-6 h-6 text-[#9FE2BF]" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-emerald-300">Civic Reporting Hub</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">Official Incident Report</h1>
              <p className="text-slate-200 text-[13px] mt-4 max-w-xl leading-relaxed font-medium">
                Submit comprehensive details regarding the civic or infrastructure issue. All reports are verified by municipal authorities and tracked by the community.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-[#9FE2BF]" /> Official Verification
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20 shadow-sm">
                  <HandCoins className="w-3.5 h-3.5 text-[#9FE2BF]" /> Community Funded
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#9FE2BF] via-[#40826D] to-slate-900 z-20"></div>
        </div>

        <CreditCard data={credits} />

        {guestBlocked && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 text-[13px] text-amber-800 dark:text-amber-300 font-semibold">
            Your role cannot post this content type yet. Apply for membership to unlock reporting.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <Section icon={<AlertCircle className="w-5 h-5 text-slate-400" />} title="Basic Details">
            <div className="space-y-2">
              <label htmlFor="title" className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Issue Title <span className="text-red-500">*</span></label>
              <input id="title" className={inputCls} placeholder="E.g., Large pothole causing traffic" value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />
              <Err msg={errors.title} />
            </div>

            <div className="space-y-2 relative">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Category <span className="text-red-500">*</span></label>
              <PremiumDropdown options={CATEGORIES.map((c) => ({ label: c, value: c }))} value={form.category} onChange={(v) => set("category", v)} placeholder="Select Category" />
              <Err msg={errors.category} />
            </div>

            {form.category === "Custom" && (
              <div className="space-y-2">
                <label htmlFor="flair" className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Custom Flair (1-7 words) <span className="text-red-500">*</span></label>
                <input id="flair" className={inputCls} placeholder="e.g. Open manhole near bus stop" value={form.customFlair} onChange={(e) => set("customFlair", e.target.value)} />
                <Err msg={errors.customFlair} />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="description" className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Description <span className="text-red-500">*</span></label>
              <textarea id="description" className="w-full min-h-[160px] p-4 rounded-lg bg-slate-50 dark:bg-[#0b1215] border border-slate-200 dark:border-[#1e3040] focus:bg-white dark:focus:bg-[#0a120e] focus:ring-2 focus:ring-[#9FE2BF]/40 focus:border-[#40826D] transition-all outline-none resize-y text-slate-800 dark:text-white placeholder-slate-400" placeholder="Provide a detailed description of the problem..." value={form.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} />
              <div className="flex justify-between">
                <Err msg={errors.description} />
                <span className="text-xs text-slate-400 ml-auto">{form.description.length}/2000</span>
              </div>
            </div>
          </Section>

          <Section icon={<MapPin className="w-5 h-5 text-slate-400" />} title="Location Details">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Pinpoint your location</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={findMe} className="text-xs text-white bg-[#40826D] hover:bg-[#2c5c4d] px-3 py-1.5 rounded-full shadow-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                  <MapPin className="w-3.5 h-3.5" /> Use My Location
                </button>
                {coords && (
                  <button type="button" onClick={() => setCoords(null)} className="text-xs text-red-500 font-medium hover:underline cursor-pointer">
                    Remove Pin
                  </button>
                )}
              </div>
            </div>
            <p className={`text-xs font-medium ${coords ? "text-[#40826D] font-semibold" : "text-slate-500 dark:text-slate-300"}`}>
              {coords ? `Pinned at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}.` : "Use GPS to attach exact coordinates and auto-fill the address below."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-[#14241d]">
              <div className="space-y-2">
                <label htmlFor="location" className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Specific Location <span className="text-red-500">*</span></label>
                <input id="location" className={inputCls} placeholder="e.g. 123 Main Street, Near Central Park" value={form.location} onChange={(e) => set("location", e.target.value)} />
                <Err msg={errors.location} />
              </div>
              <div className="space-y-2 relative">
                <label htmlFor="area" className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">City / Neighborhood <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input id="area" className={inputCls} placeholder="e.g. Downtown, Ward 5, Northside" value={form.area} onChange={(e) => set("area", e.target.value)} />
              </div>
            </div>
          </Section>

          <Section icon={<ImagePlus className="w-5 h-5 text-slate-400" />} title="Media & Timing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="date" className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Date of Incident <span className="text-red-500">*</span></label>
                <input id="date" type="date" className={inputCls} value={form.incidentDate} min={isoDay(new Date(today.getTime() - 90 * 86400000))} max={isoDay(today)} onChange={(e) => set("incidentDate", e.target.value)} />
                <Err msg={errors.incidentDate} />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1]">Registered Email</label>
                <input type="email" value={user?.email || dbUser?.email || ""} disabled className="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-[#1e3040] border border-slate-200 dark:border-[#1e3040] text-slate-500 dark:text-slate-300 cursor-not-allowed" />
              </div>
            </div>
            <div className="pt-2">
              <ImageUploader
                label="Photographic Evidence (Max 5) *"
                maxCount={5}
                onChange={(urls, pending) => {
                  setImages(urls);
                  setUploading(pending);
                  if (urls.length) setErrors((e) => ({ ...e, images: undefined }));
                }}
              />
              <Err msg={errors.images} />
            </div>
          </Section>

          <Section icon={<ShieldCheck className="w-5 h-5 text-slate-400" />} title="Advanced Options">
            <div className="flex flex-col gap-2">
              <div className={`p-5 rounded-lg border transition-all duration-500 ${form.isAnonymous ? "bg-slate-800 border-slate-700 shadow-md" : "bg-transparent border-transparent"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className={`text-[13px] font-bold flex items-center gap-2 transition-colors duration-500 ${form.isAnonymous ? "text-white" : "text-slate-800 dark:text-white"}`}>
                      <EyeOff className="w-5 h-5 text-slate-400" /> Post Anonymously
                    </label>
                    <p className={`text-[13px] transition-colors duration-500 ${form.isAnonymous ? "text-slate-400" : "text-slate-500 dark:text-slate-300"}`}>
                      {isMember ? "Hide your identity and profile from the public issue board." : "Available to verified members and volunteers."}
                    </p>
                  </div>
                  <Toggle checked={form.isAnonymous} onChange={(v) => set("isAnonymous", v)} disabled={!isMember} activeColor="bg-slate-600" label="Post anonymously" />
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-[#1e3040] w-full my-2"></div>

              <div className={`p-5 rounded-lg border transition-all duration-500 ${form.enableCrowdfunding ? "bg-[#ecfdf5] dark:bg-emerald-950/20 border-[#a7f3d0] dark:border-emerald-900/50 shadow-md" : "bg-transparent border-transparent"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className={`text-[13px] font-bold flex items-center gap-2 transition-colors duration-500 ${form.enableCrowdfunding ? "text-[#065f46] dark:text-emerald-200" : "text-slate-800 dark:text-white"}`}>
                      <HandCoins className={`w-5 h-5 ${form.enableCrowdfunding ? "text-[#10b981]" : "text-slate-400"}`} /> Enable Community Funding
                    </label>
                    <p className={`text-[13px] transition-colors duration-500 ${form.enableCrowdfunding ? "text-[#065f46]/70 dark:text-emerald-300/70" : "text-slate-500 dark:text-slate-300"}`}>Allow members to contribute funds to fix this issue directly.</p>
                  </div>
                  <Toggle checked={form.enableCrowdfunding} onChange={(v) => set("enableCrowdfunding", v)} activeColor="bg-[#10b981]" label="Enable community funding" />
                </div>
                {form.enableCrowdfunding && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 mt-5 border-t border-[#a7f3d0] dark:border-emerald-900/50">
                    <div className="space-y-2">
                      <label htmlFor="goal" className="text-[13px] font-semibold text-[#065f46] dark:text-emerald-200">Target Goal (BDT) *</label>
                      <input id="goal" type="number" inputMode="numeric" placeholder="e.g. 5000" className="w-full h-12 px-4 rounded-lg bg-white dark:bg-[#0a120e] border border-[#a7f3d0] dark:border-emerald-900/50 focus:ring-2 focus:ring-[#10b981]/40 focus:border-[#10b981] transition-all outline-none text-slate-800 dark:text-white" value={form.goal} onChange={(e) => set("goal", e.target.value)} />
                      <Err msg={errors.goal} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="purpose" className="text-[13px] font-semibold text-[#065f46] dark:text-emerald-200">Purpose *</label>
                      <input id="purpose" placeholder="e.g. Material and labor costs" maxLength={200} className="w-full h-12 px-4 rounded-lg bg-white dark:bg-[#0a120e] border border-[#a7f3d0] dark:border-emerald-900/50 focus:ring-2 focus:ring-[#10b981]/40 focus:border-[#10b981] transition-all outline-none text-slate-800 dark:text-white" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
                      <Err msg={errors.purpose} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !!noCredits || !!guestBlocked || uploading > 0}
              className={`w-full h-14 flex items-center justify-center rounded-xl text-[13px] font-bold text-white transition-all shadow-md ${submitting || noCredits || guestBlocked || uploading > 0 ? "bg-slate-400 cursor-not-allowed" : "bg-[#40826D] hover:bg-[#326756] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"}`}
            >
              {submitting ? (
                "Processing..."
              ) : uploading > 0 ? (
                "Uploading photos..."
              ) : noCredits ? (
                `Out of Credits (Restoring in ${credits.hoursLeft ?? 72}h)`
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" /> Submit Issue Report
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              By submitting you agree to our community guidelines. Need to see your reports? <Link href="/issues/my" className="text-[#0f766e] font-bold hover:underline">My Reports</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
