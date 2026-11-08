"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { updateProfile } from "firebase/auth";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import api, { errMsg, uploadImage } from "../../lib/api";
import SocialFeedCard from "../../components/SocialFeedCard";
import { MinimalLoader } from "../../components/ui";
import { placeText } from "../../lib/format";

const TABS = [
  { id: "overview", label: "Overview", icon: "ri-dashboard-line" },
  { id: "posts", label: "My Reports", icon: "ri-file-list-3-line" },
  { id: "lostfound", label: "My Lost & Found", icon: "ri-search-eye-line" },
  { id: "contributions", label: "My Donations", icon: "ri-hand-coin-line" },
  { id: "cleanup", label: "Cleanup Events", icon: "ri-leaf-line" },
  { id: "bookmarks", label: "Saved Bookmarks", icon: "ri-bookmark-line" },
  { id: "rewards", label: "Civic Rewards", icon: "ri-coupon-3-line" },
];

const BADGES = [
  { id: "civic_hero", label: "Civic Hero", need: 500, icon: "ri-medal-line", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "guardian", label: "Community Guardian", need: 1000, icon: "ri-shield-star-line", color: "text-teal-700 bg-teal-50 border-teal-200" },
  { id: "champion", label: "Champion", need: 2500, icon: "ri-trophy-line", color: "text-purple-700 bg-purple-50 border-purple-200" },
];

const inputCls =
  "w-full bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] rounded-lg px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-[#40826D] focus:ring-2 focus:ring-[#40826D]/20 transition-all font-medium hover:border-slate-300";
const labelCls = "block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1.5";
const card = "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl border border-slate-100 dark:border-[#14241d] shadow-sm";

function Field({ label, children, empty }: { label: string; children?: React.ReactNode; empty?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children ?? <div className="text-[15px] text-slate-400 italic py-2.5 px-1">{empty}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, dbUser, role, loading, refreshProfile } = useAuth();

  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"" | "avatar" | "cover">("");
  const [form, setForm] = useState({ name: "", area: "", phone: "", bio: "", photoURL: "", coverPhoto: "" });
  const [issues, setIssues] = useState<any[] | null>(null);
  const [issuesError, setIssuesError] = useState(false);
  const [credits, setCredits] = useState<any>(null);

  const [lostFoundItems, setLostFoundItems] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [myCleanups, setMyCleanups] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [resumeOpen, setResumeOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Keep the form in sync with the saved profile, but never overwrite what the user is typing.
  useEffect(() => {
    if (editing || !user) return;
    setForm({
      name: dbUser?.name || user.displayName || "",
      area: dbUser?.area || "",
      phone: dbUser?.phone || "",
      bio: dbUser?.bio || "",
      photoURL: dbUser?.photoURL || user.photoURL || "",
      coverPhoto: dbUser?.coverPhoto || "",
    });
  }, [dbUser, user, editing]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.get("/issues/my", { fresh: true }).then((r) => alive && setIssues(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : [])).catch(() => alive && (setIssues([]), setIssuesError(true)));
    api.get("/credits/issues").then((r) => alive && setCredits(r.data ?? r)).catch(() => {});
    api.get("/lost-found/my").then((r: any) => alive && setLostFoundItems(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : [])).catch(() => {});
    api.get("/contributions/my").then((r: any) => alive && setDonations(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : [])).catch(() => {});
    // API returns { organized, attending } and { bookmarkedIssues, bookmarkedEvents }.
    api.get("/cleanup-events/my").then((r: any) => {
      if (!alive) return;
      const all = [...(r.data?.organized || []), ...(r.data?.attending || [])];
      setMyCleanups(all.filter((ev, i) => all.findIndex((x) => x._id === ev._id) === i));
    }).catch(() => {});
    api.get("/users/my/bookmarks").then((r: any) => alive && setBookmarks(r.data?.bookmarkedIssues || [])).catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const points = dbUser?.points ?? 0;
  const displayName = form.name || dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "Citizen";
  const provider = user?.providerData?.[0]?.providerId;
  const approvedCount = useMemo(() => (issues || []).filter((i) => i.approvalStatus === "approved").length, [issues]);
  const nextBadge = BADGES.find((b) => points < b.need);

  const pickFile = (kind: "avatar" | "cover") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return toast.error("Image must be smaller than 5MB.");
      setUploading(kind);
      try {
        const url = await uploadImage(file);
        setForm((f) => ({ ...f, [kind === "avatar" ? "photoURL" : "coverPhoto"]: url }));
        toast.success("Image uploaded. Remember to save your changes.");
      } catch (err) {
        toast.error(errMsg(err, "Upload failed. Please try again."));
      } finally {
        setUploading("");
      }
    };
    input.click();
  };

  const save = async () => {
    if (!user || saving) return;
    if (!form.name.trim()) return toast.error("Display name cannot be empty.");
    setSaving(true);
    try {
      await api.put("/users/me/profile", { name: form.name.trim(), area: form.area.trim(), phone: form.phone.trim(), bio: form.bio.trim(), photoURL: form.photoURL.trim(), coverPhoto: form.coverPhoto.trim() });
      await updateProfile(user, { displayName: form.name.trim(), photoURL: form.photoURL.trim() || null }).catch(() => {});
      await refreshProfile();
      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      toast.error(errMsg(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <MinimalLoader />
      </div>
    );
  }

  const stats = [
    { label: "Civic Points", value: points, cls: "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30 text-teal-600", sub: "text-teal-700/80 dark:text-teal-400" },
    { label: "Reports Filed", value: issues?.length ?? "–", cls: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-600", sub: "text-amber-700/80 dark:text-amber-400" },
    { label: "Report Credits", value: credits?.isAdmin ? "∞" : credits ? `${credits.remaining}/${credits.limit}` : "–", cls: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 text-purple-600", sub: "text-purple-700/80 dark:text-purple-400" },
    { label: "Day Streak", value: dbUser?.streak?.current ?? 0, cls: "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 text-orange-600", sub: "text-orange-700/80 dark:text-orange-400" },
  ];

  return (
    <div className="min-h-screen pb-16 font-body">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-2">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 ${card}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#40826D]/10 rounded-lg flex items-center justify-center border border-[#40826D]/20">
              <i className="ri-dashboard-3-line text-[#40826D] text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: "HKGrotesk" }}>My Dashboard</h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-300 font-medium mt-0.5">Manage your profile, reports, and community contributions.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => setResumeOpen(true)} className="group flex items-center justify-center gap-2 bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[13px] font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all w-full sm:w-auto shrink-0 cursor-pointer hover:border-[#40826D]/40 hover:text-[#40826D]">
              <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-[#0a120e] flex items-center justify-center"><i className="ri-award-line text-[13px] text-[#40826D]"></i></div>
              Civic Impact Resume
            </button>
            <Link href="/issues/add" className="flex items-center justify-center gap-2 bg-[#40826D] hover:bg-[#326756] text-white text-[13px] font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all w-full sm:w-auto shrink-0">
              <i className="ri-add-line"></i> Report an Issue
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 flex flex-col lg:flex-row gap-5">
        {/* Sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className={`p-4 sticky top-28 ${card}`}>
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-[#14241d]">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-[#1e3040] border border-slate-200 dark:border-[#1e3040] flex-shrink-0 flex items-center justify-center text-lg font-bold text-[#0f766e]">
                {form.photoURL ? <img src={form.photoURL} className="w-full h-full object-cover" alt="User avatar" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = "none")} /> : displayName[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-semibold text-slate-800 dark:text-white text-[13px] truncate tracking-tight">{displayName}</h3>
                <span className="text-[11px] font-semibold text-[#40826D] bg-[#9FE2BF]/20 px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#40826D]/10">{role}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-gradient-to-r from-white to-amber-50 dark:from-[#0a120e] dark:to-amber-950/20 p-3 rounded-lg border border-white/80 dark:border-[#14241d] flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Impact</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{points}</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#0b1215] p-3 rounded-lg border border-slate-100 dark:border-[#14241d] flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1">Status</span>
                <div className="mt-1 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/60 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-2" aria-label="Dashboard sections">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2 px-2">Menu</span>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id}
                  className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                    tab === t.id ? "bg-[#40826D] text-white shadow-md shadow-[#40826D]/20 translate-x-1 font-semibold" : "text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#0b1215] hover:text-slate-900 dark:hover:text-white hover:shadow-sm"
                  }`}
                >
                  <i className={`${t.icon} text-[13px] ${tab === t.id ? "text-white" : "text-slate-500 dark:text-slate-300"}`}></i>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0 min-h-[600px] relative">
          <AnimatePresence mode="wait">
            {tab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex flex-col gap-4 w-full">
                <div className={`w-full overflow-hidden flex flex-col ${card}`}>
                  <div className="w-full h-48 md:h-64 bg-slate-200 dark:bg-[#14241d] relative group">
                    {form.coverPhoto ? <img src={form.coverPhoto} alt="Cover" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /> : <div className="w-full h-full bg-gradient-to-br from-teal-800 via-slate-800 to-emerald-950"></div>}
                    {editing && (
                      <button onClick={() => pickFile("cover")} disabled={uploading === "cover"} className="absolute bottom-4 right-4 bg-white/90 text-slate-800 px-4 py-2 rounded-xl font-bold text-[13px] shadow-lg cursor-pointer flex items-center gap-2 backdrop-blur-sm transition-all z-10 border border-slate-200 disabled:opacity-60">
                        <i className="ri-image-add-fill text-[13px]"></i>
                        <span className="hidden sm:inline">{uploading === "cover" ? "Uploading…" : "Change Cover"}</span>
                      </button>
                    )}
                  </div>

                  <div className="px-8 pb-8 relative flex flex-col md:flex-row items-center md:items-end gap-4 z-10">
                    <button type="button" disabled={!editing || uploading === "avatar"} onClick={() => pickFile("avatar")} className={`relative group shrink-0 -mt-12 md:-mt-16 ${editing ? "cursor-pointer" : "cursor-default"}`} aria-label="Change profile photo">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-[#0a120e] shadow-xl relative z-10 bg-slate-100 dark:bg-[#1e3040] ring-2 ring-slate-50 dark:ring-[#14241d] flex items-center justify-center text-3xl font-bold text-[#0f766e]">
                        {form.photoURL ? <img src={form.photoURL} alt="avatar" className={`w-full h-full object-cover transition-all ${editing ? "group-hover:brightness-75" : ""}`} referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = "none")} /> : displayName[0]?.toUpperCase()}
                      </div>
                      {editing && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="ri-camera-fill text-white text-3xl drop-shadow-md"></i>
                        </div>
                      )}
                    </button>

                    <div className="flex-1 text-center md:text-left relative mt-4 pb-2">
                      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: "HKGrotesk" }}>{displayName}</h2>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : role === "member" ? "bg-[#40826D]/10 text-[#40826D] border-[#40826D]/20" : "bg-slate-100 dark:bg-[#1e3040] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1e3040]"}`}>{role}</span>
                        {dbUser?.memberId && (role === "member" || role === "admin") && (
                          <span className="bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-full border border-amber-200 shadow-sm flex items-center gap-1">
                            <i className="ri-shield-star-fill"></i> ID: {dbUser.memberId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {stats.map((s) => (
                    <div key={s.label} className={`p-4 rounded-2xl border ${s.cls.split(" ").filter((c) => !c.startsWith("text-")).join(" ")}`}>
                      <span className={`block text-2xl font-black font-display ${s.cls.split(" ").find((c) => c.startsWith("text-"))}`}>{s.value}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${s.sub}`}>{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className={`lg:col-span-2 p-5 ${card}`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[13px] font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight" style={{ fontFamily: "HKGrotesk" }}>
                        <i className="ri-user-settings-line text-[#40826D]"></i> Profile Information
                      </h3>
                      {!editing && (
                        <button onClick={() => setEditing(true)} className="text-[13px] font-bold text-[#40826D] bg-[#40826D]/10 hover:bg-[#40826D]/20 px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer">
                          <i className="ri-pencil-line"></i> Edit Profile
                        </button>
                      )}
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Display Name" empty="Not specified">
                          {editing ? <input className={inputCls} value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /> : form.name ? <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 py-2.5 px-1">{form.name}</div> : undefined}
                        </Field>
                        <Field label="Neighborhood / Area" empty="Not specified">
                          {editing ? <input className={inputCls} value={form.area} maxLength={120} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Ward 1, Central District" /> : form.area ? <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 py-2.5 px-1">{form.area}</div> : undefined}
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Contact Phone" empty="Not specified">
                          {editing ? <input type="tel" className={inputCls} value={form.phone} maxLength={40} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +8801712345678" /> : form.phone ? <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 py-2.5 px-1">{form.phone}</div> : undefined}
                        </Field>
                      </div>
                      <Field label="Short Bio" empty="No bio added yet. Tell the community about yourself!">
                        {editing ? <textarea rows={4} className={`${inputCls} resize-none`} value={form.bio} maxLength={500} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell the community about yourself..." /> : form.bio ? <div className="text-[15px] text-slate-600 dark:text-slate-300 py-2 px-1 whitespace-pre-line leading-relaxed">{form.bio}</div> : undefined}
                      </Field>
                    </div>

                    {editing && (
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-[#14241d]">
                        <button onClick={() => setEditing(false)} disabled={saving} className="w-full sm:w-auto bg-slate-100 dark:bg-[#1e3040] hover:bg-slate-200 dark:hover:bg-[#284257] text-slate-700 dark:text-[#cbd5e1] font-bold py-2.5 px-6 rounded-lg transition-all cursor-pointer">
                          Cancel
                        </button>
                        <button onClick={save} disabled={saving} className="w-full sm:w-auto bg-[#40826D] hover:bg-[#326756] text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...
                            </>
                          ) : (
                            <>
                              <i className="ri-save-3-line"></i> Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className={`p-5 ${card}`}>
                      <h3 className="text-[13px] font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 tracking-tight" style={{ fontFamily: "HKGrotesk" }}>
                        <i className="ri-shield-check-line text-[#40826D]"></i> Account Status
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <label className={labelCls}>Email Address</label>
                          <div className="w-full bg-slate-50 dark:bg-[#0b1215] border border-slate-100 dark:border-[#14241d] rounded-xl px-4 py-3 text-slate-500 dark:text-slate-300 font-medium flex items-center justify-between">
                            <span className="truncate text-[13px]">{user.email}</span>
                            <i className="ri-lock-line text-slate-300"></i>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Email cannot be changed.</p>
                        </div>
                        <div>
                          <label className={labelCls}>Security Badges</label>
                          <div className="flex flex-col gap-3">
                            <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${user.emailVerified ? "bg-[#9FE2BF]/10 text-[#40826D] border-[#9FE2BF]/30" : "bg-red-50 text-red-600 border-red-200"}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${user.emailVerified ? "bg-[#40826D]/10" : "bg-red-100"}`}>
                                <i className={user.emailVerified ? "ri-shield-check-fill" : "ri-shield-cross-fill"}></i>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold">{user.emailVerified ? "Email Verified" : "Email Unverified"}</span>
                                <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">Authentication</span>
                              </div>
                            </div>
                            <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${provider === "google.com" ? "bg-blue-50/50 text-blue-700 border-blue-200" : "bg-slate-50 dark:bg-[#0b1215] text-slate-700 dark:text-[#cbd5e1] border-slate-200 dark:border-[#1e3040]"}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${provider === "google.com" ? "bg-blue-100" : "bg-slate-200 dark:bg-[#1e3040]"}`}>
                                <i className={provider === "google.com" ? "ri-google-fill" : "ri-mail-lock-fill"}></i>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold">{provider === "google.com" ? "Google Linked" : "Password Login"}</span>
                                <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">Provider</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {role === "guest" && (
                  <div className="w-full relative overflow-hidden rounded-xl p-5 border border-slate-700/50 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0"><i className="ri-shield-user-fill text-amber-400 text-lg"></i></div>
                        <div>
                          <h4 className="font-extrabold tracking-tight" style={{ fontFamily: "HKGrotesk" }}>Unlock Verified Residency</h4>
                          <p className="text-slate-400 text-[13px] mt-1 max-w-xl">Members can vote in polls, post anonymously, organise cleanups and earn a Resident ID.</p>
                        </div>
                      </div>
                      <button onClick={() => router.push("/membership/request")} className="px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 text-[13px] font-extrabold shrink-0 cursor-pointer">Apply for Membership</button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === "posts" && (
              <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className={`w-full p-4 ${card}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-3xl tracking-tight font-extrabold bg-gradient-to-r from-teal-800 to-[#1e5844] dark:from-teal-300 dark:to-emerald-400 bg-clip-text text-transparent inline-block">My Reports</h2>
                    <p className="text-slate-700 dark:text-[#cbd5e1] font-medium text-[13px] mt-0.5">Track the status of civic issues you have reported.{issues && issues.length > approvedCount ? ` ${issues.length - approvedCount} awaiting review.` : ""}</p>
                  </div>
                  <Link href="/issues/add" className="btn bg-[#40826D] hover:bg-[#326756] text-white border-none shadow-md rounded-full px-6">
                    <i className="ri-add-line"></i> Report New
                  </Link>
                </div>
                {issues === null ? (
                  <div className="py-12"><MinimalLoader /></div>
                ) : issuesError ? (
                  <p className="text-center text-[13px] text-rose-500 py-8">We couldn&apos;t load your reports right now.</p>
                ) : issues.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-[#0b1215] rounded-xl border border-slate-100 dark:border-[#14241d] max-w-2xl mx-auto shadow-inner">
                    <div className="w-20 h-20 bg-white dark:bg-[#0a120e] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 dark:border-[#14241d]"><i className="ri-file-add-line text-3xl text-slate-300"></i></div>
                    <h3 className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1]">No issues reported yet</h3>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 mb-6">You haven&apos;t reported any civic problems. Help your community by bringing attention to local issues.</p>
                    <Link href="/issues/add" className="btn bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] text-slate-700 dark:text-[#cbd5e1] rounded-full px-6 shadow-sm">Start Reporting</Link>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    {issues.map((issue) => (
                      <SocialFeedCard key={issue._id} issue={{ ...issue, _type: "issue" }} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "lostfound" && (
              <motion.div key="lostfound" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`w-full p-6 ${card}`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">My Lost &amp; Found Listings</h3>
                    <p className="text-xs text-slate-500">Manage items you reported lost or found in your neighbourhood.</p>
                  </div>
                  <Link href="/lost-found" className="px-4 py-2 rounded-xl bg-[#40826D] text-white text-xs font-bold">Browse Hub</Link>
                </div>
                {lostFoundItems.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-500 mb-4">You have not posted any Lost &amp; Found items yet.</p>
                    <Link href="/lost-found/add-lost" className="px-5 py-2.5 rounded-xl bg-[#40826D] text-white text-xs font-bold">Report Lost Item</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lostFoundItems.map((item) => (
                      <Link key={item._id} href={`/lost-found/${item._id}`} className="p-4 rounded-xl border border-slate-100 hover:border-[#40826D]/40 transition flex items-center gap-4">
                        <img src={item.images?.[0] || item.image || "/logo.png"} alt={item.title} className="w-16 h-16 rounded-lg object-cover" onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
                        <div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700">{item.type}</span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{item.title}</h4>
                          <p className="text-xs text-slate-500">{item.location}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "contributions" && (
              <motion.div key="contributions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`w-full p-6 ${card}`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">My Donations &amp; Contributions</h3>
                    <p className="text-xs text-slate-500">Transparent ledger of your community contributions.</p>
                  </div>
                  <Link href="/fund" className="px-4 py-2 rounded-xl bg-[#40826D] text-white text-xs font-bold">Fund a Cause</Link>
                </div>
                {donations.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-500 mb-4">No donations recorded yet.</p>
                    <Link href="/support" className="px-5 py-2.5 rounded-xl bg-[#40826D] text-white text-xs font-bold">Support CivicNest</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {donations.map((d) => (
                      <div key={d._id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{d.issueTitle || "CivicNest Community Cause"}</div>
                          <div className="text-xs text-slate-400">{d.transactionId || "Verified Receipt"}</div>
                        </div>
                        <div className="font-extrabold text-emerald-700">৳{Number(d.amount || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "cleanup" && (
              <motion.div key="cleanup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`w-full p-6 ${card}`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">My Cleanup Drives</h3>
                    <p className="text-xs text-slate-500">Drives you organised or joined as a volunteer.</p>
                  </div>
                  <Link href="/cleanup-events/organize" className="px-4 py-2 rounded-xl bg-[#40826D] text-white text-xs font-bold">Organise Drive</Link>
                </div>
                {myCleanups.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-500 mb-4">You haven&apos;t joined or organised any cleanup drives yet.</p>
                    <Link href="/cleanup-events" className="px-5 py-2.5 rounded-xl bg-[#40826D] text-white text-xs font-bold">Browse Cleanup Drives</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myCleanups.map((ev) => (
                      <Link key={ev._id} href={`/cleanup-events/${ev._id}`} className="p-4 rounded-xl border border-slate-100 hover:border-[#40826D]/40 transition">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{ev.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{placeText(ev.location)}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "bookmarks" && (
              <motion.div key="bookmarks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`w-full p-6 ${card}`}>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">Saved Bookmarks</h3>
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No bookmarked issues yet.</p>
                ) : (
                  <div className="space-y-4">
                    {bookmarks.map((b) => (
                      <SocialFeedCard key={b._id} issue={{ ...b, _type: "issue" }} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "rewards" && (
              <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className={`w-full p-5 ${card}`}>
                <h3 className="text-[13px] font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2 tracking-tight" style={{ fontFamily: "HKGrotesk" }}><i className="ri-coupon-3-line text-[#40826D]"></i> Civic Rewards</h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-300 mb-6">Earn points by reporting, voting, verifying fixes and joining cleanups. Badges unlock automatically.</p>
                {nextBadge ? (
                  <div className="mb-8 p-4 rounded-xl bg-slate-50 dark:bg-[#0b1215] border border-slate-100 dark:border-[#14241d]">
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-2"><span>Next badge: {nextBadge.label}</span><span>{points} / {nextBadge.need} pts</span></div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-[#14241d] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700" style={{ width: `${Math.min((points / nextBadge.need) * 100, 100)}%` }}></div></div>
                  </div>
                ) : (
                  <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-bold">You&apos;ve unlocked every badge. Legendary!</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {BADGES.map((b) => {
                    const earned = points >= b.need || !!dbUser?.badges?.includes(b.id);
                    return (
                      <div key={b.id} className={`p-4 rounded-xl border text-center transition ${earned ? b.color : "bg-slate-50 dark:bg-[#0b1215] border-slate-200 dark:border-[#1e3040] text-slate-400 grayscale opacity-70"}`}>
                        <i className={`${b.icon} text-3xl`}></i>
                        <p className="font-extrabold text-[13px] mt-2">{b.label}</p>
                        <p className="text-[11px] font-semibold mt-0.5">{earned ? "Unlocked" : `${b.need} points`}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Civic Impact Resume Modal */}
      {resumeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a120e] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 dark:border-[#14241d]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#40826D]">Official Civic Record</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{displayName}</h3>
                <p className="text-xs text-slate-500">{user.email} • Role: {role.toUpperCase()}</p>
              </div>
              <button onClick={() => setResumeOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-teal-50 text-center">
                <div className="text-xl font-black text-teal-700">{points}</div>
                <div className="text-[10px] font-bold uppercase text-teal-600">Civic Points</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 text-center">
                <div className="text-xl font-black text-amber-700">{issues?.length || 0}</div>
                <div className="text-[10px] font-bold uppercase text-amber-600">Reports Filed</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-center">
                <div className="text-xl font-black text-emerald-700">{donations.length}</div>
                <div className="text-[10px] font-bold uppercase text-emerald-600">Donations</div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl bg-[#40826D] text-white text-xs font-bold">Print / Save PDF</button>
              <button onClick={() => setResumeOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
