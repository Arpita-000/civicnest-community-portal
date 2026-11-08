"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import Banner from "../components/Banner";
import { errMsg } from "../lib/api";

// 8 Quick Actions exactly matching Community_App
const QUICK_ACTIONS = [
  {
    id: "civicbot",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912-1.275-1.275Z"/>
        <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"/>
        <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/>
      </svg>
    ),
    title: "CivicBot AI Assistant",
    desc: "Draft incident reports, categories, and letters with AI.",
    color: "#0f766e",
    bg: "#e0f2fe",
    path: "/ai-assistant",
  },
  {
    id: "report",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    title: "Report an Issue",
    desc: "Flag litter, damage, or pollution in your area.",
    color: "#f97316",
    bg: "#fff4ec",
    path: "/issues/add",
  },
  {
    id: "cleanup",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    ),
    title: "Organise a Cleanup",
    desc: "Schedule an event and recruit volunteers.",
    color: "#0f766e",
    bg: "#ecf4f3",
    path: "/cleanup-events/organize",
  },
  {
    id: "donate",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    title: "Fund a Cleanup",
    desc: "Support community drives with micro-donations.",
    color: "#db2777",
    bg: "#fceef4",
    path: "/fund",
  },
  {
    id: "map",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/>
        <line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
    title: "Explore Map",
    desc: "View reported issues and cleanups on the live map.",
    color: "#059669",
    bg: "#ecfdf5",
    path: "/map",
  },
  {
    id: "lostfound",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
    title: "Lost & Found",
    desc: "Find lost belongings or search found objects.",
    color: "#d97706",
    bg: "#fef3c7",
    path: "/lost-found",
  },
  {
    id: "polls",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    title: "Vote in Polls",
    desc: "Participate in local decisions and community polls.",
    color: "#0891b2",
    bg: "#ecfeff",
    path: "/polls",
  },
  {
    id: "verify",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 11 2 2 4-4"/>
      </svg>
    ),
    title: "Verify Fixes",
    desc: "Confirm reported resolutions to earn points.",
    color: "#2563eb",
    bg: "#eff6ff",
    path: "/issues/verify",
  },
];

const TYPE_META: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  drive_joined: { bg: "rgba(14, 165, 233, 0.08)", color: "#0284c7", border: "rgba(14, 165, 233, 0.15)", icon: "ri-group-line", label: "Volunteer RSVP" },
  drive_completed: { bg: "rgba(16, 185, 129, 0.08)", color: "#059669", border: "rgba(16, 185, 129, 0.15)", icon: "ri-checkbox-circle-line", label: "Drive Completed" },
  cleanup_approved: { bg: "rgba(15, 118, 110, 0.08)", color: "#0f766e", border: "rgba(15, 118, 110, 0.15)", icon: "ri-leaf-line", label: "Cleanup Event" },
  new_cleanup_event: { bg: "rgba(15, 118, 110, 0.08)", color: "#0f766e", border: "rgba(15, 118, 110, 0.15)", icon: "ri-leaf-line", label: "Cleanup Event" },
  donation_made: { bg: "rgba(219, 39, 119, 0.08)", color: "#db2777", border: "rgba(219, 39, 119, 0.15)", icon: "ri-hand-coin-line", label: "Donation" },
  social_activity: { bg: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", border: "rgba(79, 70, 229, 0.15)", icon: "ri-discuss-line", label: "Forum Post" },
  incident_reported: { bg: "rgba(249, 115, 22, 0.08)", color: "#ea580c", border: "rgba(249, 115, 22, 0.15)", icon: "ri-alert-line", label: "Incident Reported" },
  poll_created: { bg: "rgba(220, 38, 38, 0.08)", color: "#dc2626", border: "rgba(220, 38, 38, 0.15)", icon: "ri-bar-chart-grouped-line", label: "Community Poll" },
  issue_solved: { bg: "rgba(16, 185, 129, 0.08)", color: "#059669", border: "rgba(16, 185, 129, 0.15)", icon: "ri-checkbox-circle-fill", label: "Issue Solved" },
  new_issue: { bg: "rgba(239, 68, 68, 0.08)", color: "#dc2626", border: "rgba(239, 68, 68, 0.15)", icon: "ri-alert-fill", label: "Issue Flagged" },
};


const TYPE_META_EXTRA: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  animal_rescued: { bg: "rgba(236, 72, 153, 0.08)", color: "#db2777", border: "rgba(236, 72, 153, 0.15)", icon: "ri-heart-3-line", label: "Animal Rescue" },
  lostfound_reunited: { bg: "rgba(37, 99, 235, 0.08)", color: "#2563eb", border: "rgba(37, 99, 235, 0.15)", icon: "ri-search-eye-line", label: "Reunited" },
  poll_ended: { bg: "rgba(220, 38, 38, 0.08)", color: "#dc2626", border: "rgba(220, 38, 38, 0.15)", icon: "ri-bar-chart-grouped-line", label: "Poll Closed" },
};

/** One readable sentence per feed event type (events carry different data shapes). */
function activityParts(item: any): { actor: string; rest: string } {
  const d = item.data || {};
  const at = d.area ? ` in ${d.area}` : "";
  switch (item.type) {
    case "incident_reported":
    case "new_issue":
      return { actor: d.reporterName || d.actorName || "A neighbour", rest: `flagged ${d.category ? `a ${d.category} issue` : "an issue"}${at}: “${d.title}”` };
    case "issue_solved":
      return { actor: "The community", rest: `solved “${d.title}”${at}` };
    case "poll_created":
      return { actor: d.actorName || "A member", rest: `opened a poll: “${d.question}”` };
    case "poll_ended":
      return { actor: "Poll closed:", rest: `“${d.question}” ended with ${d.totalVotes || 0} votes` };
    case "drive_joined":
      return { actor: `${d.count || 1} neighbours`, rest: `joined “${d.driveTitle}”${at}` };
    case "drive_completed":
      return { actor: `${d.count || 1} volunteers`, rest: `completed “${d.driveTitle}”${at}` };
    case "new_cleanup_event":
    case "cleanup_approved":
      return { actor: d.actorName || "An organiser", rest: `scheduled “${d.driveTitle || d.title}”${at}` };
    case "donation_made":
      return { actor: d.donor || "A neighbour", rest: `donated ৳${d.amount} to “${d.title}”` };
    case "social_activity":
      return { actor: d.authorName || "A member", rest: `started a ${d.category || "community"} discussion: “${d.title}”` };
    case "animal_rescued":
      return { actor: d.actorName || "A rescuer", rest: `rescued a ${d.animalType} at ${d.location}` };
    case "lostfound_reunited":
      return { actor: "A neighbour", rest: `was reunited with ${d.itemName} (${d.location})` };
    default:
      return { actor: d.actorName || "Citizen", rest: d.title || d.question || "did something helpful" };
  }
}
const activityText = (item: any) => {
  const { actor, rest } = activityParts(item);
  return `${actor} ${rest}`;
};

function MembershipPromo({ user, displayName, router }: { user: any; displayName: string; router: any }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="home-section relative overflow-visible w-full pt-6 pb-0 mb-0 animate-fadeIn"
    >
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f766e] mb-1">CIVIC INTEGRATION</p>
        <h2 className="text-2xl tracking-tight md:text-[1.65rem] font-bold text-slate-900 dark:text-white">
          Verified Residency & Rewards
        </h2>
        <p className="text-slate-500 dark:text-slate-300 text-[13px] mt-1 max-w-xl">
          Get verified to unlock administrative privileges and register for volunteer point multipliers.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-6 items-stretch">
        {/* Card 1: Resident Card & CTA */}
        <div className="col-span-12 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-[2.25rem] p-5 md:p-10 flex flex-col md:flex-row justify-between items-center gap-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          {/* Left info area */}
          <div className="flex-1 space-y-6 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <i className="ri-shield-check-fill animate-pulse"></i> RESIDENT BADGE
            </div>
            <h3 className="text-2xl tracking-tight md:text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: 'HKGrotesk, sans-serif' }}>
              Unlock Verification
            </h3>
            <p className="text-slate-400 text-[13px] leading-relaxed max-w-md">
              Verify your residency to help claim and solve community reports, host cleanup events, and post inside the forum.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
              {user ? (
                <button 
                  onClick={() => router.push("/profile")}
                  className="btn-premium"
                >
                  View Verified Profile
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => router.push("/register")}
                    className="btn-premium"
                  >
                    Register Now
                  </button>
                  <button 
                    onClick={() => router.push("/login")}
                    className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full transition-all shadow-md text-[13px] uppercase tracking-wider text-center"
                  >
                    Log In
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Resident ID preview graphic */}
          <div className="shrink-0 z-10 w-full max-w-sm flex flex-col">
            <div className="relative overflow-hidden w-full h-48 bg-gradient-to-br from-slate-900/90 to-amber-950/80 border border-amber-500/20 rounded-lg p-4 shadow-2xl flex flex-col justify-between backdrop-blur-xl group/id transition-transform duration-500 hover:rotate-1 hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-400/30 flex items-center justify-center">
                    <i className="ri-shield-user-fill text-amber-400 text-[13px]"></i>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 tracking-wider">CIVICNEST</span>
                    <span className="block text-[11px] font-black text-amber-400 tracking-widest leading-none">RESIDENT</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 border border-amber-400/30 text-amber-400 text-[9px] font-extrabold uppercase rounded-full tracking-widest">
                    <i className="ri-lock-line text-[10px]"></i> LOCKED
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Resident Holder</span>
                <span className="block text-[13px] font-extrabold text-slate-100 tracking-tight truncate">{displayName}</span>
                <span className="block text-[10px] text-amber-400/80 font-semibold tracking-tight truncate">{user?.email || "guest@civicnest.org"}</span>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800/60 pt-3 mt-3">
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">ID Reference</span>
                  <span className="block text-[10px] font-mono text-slate-400 font-bold tracking-tight">CN-RES-[LOCKED]</span>
                </div>
                <div className="flex gap-0.5 h-6 items-end opacity-30 group-hover/id:opacity-50 transition-opacity duration-300">
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[2px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-3 bg-slate-400"></div>
                  <div className="w-[3px] h-full bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                  <div className="w-[2px] h-2 bg-slate-400"></div>
                  <div className="w-[1px] h-full bg-slate-400"></div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-slate-400 text-[11px] font-medium leading-normal flex items-start gap-1.5 px-1 text-left">
              <i className="ri-information-line text-amber-400 text-xs shrink-0 mt-0.5"></i>
              <span>Your official digital Resident ID is currently locked. Verify residency to unlock your unique reference ID and verified credentials.</span>
            </div>
          </div>
        </div>

        {/* Card 2: 2x Points */}
        <div 
          onClick={() => (user ? router.push("/volunteers/register") : router.push("/register"))}
          className="col-span-12 md:col-span-6 lg:col-span-3 uiverse-card uiverse-card--multiplier"
        >
          <div className="space-y-3">
            <h4 className="uiverse-card-heading">
              <i className="ri-flashlight-line text-[#d97706]"></i> Volunteer Points Multiplier
            </h4>
            <p className="uiverse-card-desc">
              Register to volunteer after your residency is verified to unlock double points (2x) on all cleanup tasks.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="text-2xl font-black text-[#b45309] drop-shadow">+2x Points</span>
            <span className="uiverse-card-cta">
              Activate Now <i className="ri-arrow-right-line"></i>
            </span>
          </div>
        </div>

        {/* Card 3: Forum Access */}
        <div 
          onClick={() => (user ? router.push("/forum") : router.push("/register"))}
          className="col-span-12 md:col-span-6 lg:col-span-3 uiverse-card uiverse-card--forum"
        >
          <div className="space-y-3">
            <h4 className="uiverse-card-heading">
              <i className="ri-discuss-line text-[#9333ea]"></i> Forum Discussions
            </h4>
            <p className="uiverse-card-desc">
              Unlock access to post discussions, create new threads, and debate local community initiatives in the public forum.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Verified Privilege</span>
            <span className="uiverse-card-cta">
              Verify to Post <i className="ri-arrow-right-line"></i>
            </span>
          </div>
        </div>

        {/* Card 4: Event Organizer */}
        <div 
          onClick={() => (user ? router.push("/cleanup-events/organize") : router.push("/register"))}
          className="col-span-12 md:col-span-6 lg:col-span-3 uiverse-card uiverse-card--organize"
        >
          <div className="space-y-3">
            <h4 className="uiverse-card-heading">
              <i className="ri-focus-3-line text-[#0f766e]"></i> Organize Cleanup Drives
            </h4>
            <p className="uiverse-card-desc">
              Propose official neighborhood cleanup events, collect donations, recruit volunteer support, and direct community actions.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Verified Privilege</span>
            <span className="uiverse-card-cta">
              Get Started <i className="ri-arrow-right-line"></i>
            </span>
          </div>
        </div>

        {/* Card 5: Issue Verification */}
        <div 
          onClick={() => (user ? router.push("/issues/verify") : router.push("/register"))}
          className="col-span-12 md:col-span-6 lg:col-span-3 uiverse-card uiverse-card--resolution"
        >
          <div className="space-y-3">
            <h4 className="uiverse-card-heading">
              <i className="ri-shield-check-line text-[#2563eb]"></i> Issue Resolution Authority
            </h4>
            <p className="uiverse-card-desc">
              Inspect reported neighborhood problems, verify resolution claims, and check solutions on the map to release reporter points.
            </p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Verified Privilege</span>
            <span className="uiverse-card-cta">
              Claim Authority <i className="ri-arrow-right-line"></i>
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, dbUser } = useAuth();

  // Live platform numbers (never invented: show a dash until the API answers)
  const [stats, setStats] = useState<any>(null);
  const fmt = (n?: number) => (typeof n === "number" ? n.toLocaleString() : "–");

  // Typewriter phrases
  const heroPhrases = ["cleaner streets.", "greener parks.", "safer neighborhoods.", "a better tomorrow."];
  const [heroPhraseIdx, setHeroPhraseIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroPhraseIdx((p) => (p + 1) % heroPhrases.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Fetch Public Stats
  useEffect(() => {
    api.get("/public/stats")
      .then((res) => res.data?.success && setStats(res.data.data))
      .catch(() => {});
  }, []);

  // Feed Data
  const [feedData, setFeedData] = useState<any[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedReload, setFeedReload] = useState(0);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  useEffect(() => {
    setIsFeedLoading(true);
    api.get("/public/feed", { params: { page: feedPage, limit: 10 } })
      .then((res) => {
        if (res.data?.data) {
          setFeedData((prev) => (feedPage === 1 ? res.data.data : [...prev, ...res.data.data]));
          setHasMoreFeed(res.data.hasMore);
        }
      })
      .catch(() => {})
      .finally(() => setIsFeedLoading(false));
  }, [feedPage, feedReload]);

  // Upcoming cleanups
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  useEffect(() => {
    api.get("/cleanup-events", { params: { upcoming: true, limit: 4 } })
      .then((res) => {
        if (res.data?.events) setUpcomingEvents(res.data.events);
      })
      .catch(() => {});
  }, []);

  // Quick Incident Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    title: "",
    area: "",
    description: "",
    category: "General Waste",
    reporterName: "",
    anonymous: false
  });

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.title.trim() || !incidentForm.area.trim() || !incidentForm.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmittingIncident(true);
    try {
      const payload = {
        title: incidentForm.title,
        area: incidentForm.area,
        description: incidentForm.description,
        category: incidentForm.category,
        reporterName: incidentForm.anonymous ? "Anonymous Neighbour" : (incidentForm.reporterName || user?.displayName || "Resident")
      };

      const res = await api.post("/public/incidents", payload);
      if (res.data?.success) {
        toast.success("Incident reported successfully! The community has been updated.");
        setShowReportModal(false);
        setIncidentForm({
          title: "",
          area: "",
          description: "",
          category: "General Waste",
          reporterName: "",
          anonymous: false
        });
        // Refresh feed
        setFeedPage(1);
        setFeedReload((n) => n + 1);
      } else {
        toast.error(res.data?.message || "Failed to submit incident.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error submitting incident report.");
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const displayName = dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "Neighbour";

  return (
    <div className="home-root">
      {/* ── WARP SHADER HERO ────────────────────────────────────────── */}
      <section className="home-hero relative overflow-hidden">
        <div className="home-hero-shader absolute inset-0" aria-hidden="true">
          <div className="home-hero-warp-fallback" />
        </div>
        <div className="home-hero-overlay" aria-hidden="true" />

        <div className="home-hero-inner relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="home-hero-text"
          >
            <div className="home-hero-badge">
              <span className="home-hero-badge-dot" />
              Community Dashboard
            </div>
            <h1 className="home-hero-title tracking-tight">
              Welcome back,{" "}
              <span className="home-hero-title-name">{displayName}</span>{" "}
              <motion.img 
                src="/waving-hand.png"
                alt="👋"
                width={34}
                height={34}
                className="inline-block origin-[70%_70%] -translate-y-0.5 ml-1"
                animate={{ rotate: [0, 25, -15, 25, -15, 20, 0, 0] }}
                transition={{
                  duration: 1.8,
                  ease: "easeInOut",
                  times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                  repeat: Infinity,
                  repeatDelay: 3.5
                }}
              />
            </h1>
            <p className="home-hero-sub text-[13px] mt-2">
              Your city needs you. Let&apos;s build{" "}
              <span className="text-[#6EE7B7] font-bold">
                {heroPhrases[heroPhraseIdx]}
              </span>
              <br />
              Report issues, organise cleanups, and celebrate every win with {stats?.activeMembers ? `${fmt(stats.activeMembers)} neighbours` : "your neighbours"}.
            </p>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="home-stats-row-wrap"
          >
            <div className="home-stats-row">
              {[
                { label: "Issues Reported", value: fmt(stats?.totalIssuesReported), delta: stats ? `${fmt(stats.openIssues)} still open` : "", accent: "#f97316" },
                { label: "Resolved", value: fmt(stats?.issuesResolved), delta: stats?.totalIssuesReported ? `${Math.round((stats.issuesResolved / stats.totalIssuesReported) * 100)}% resolution rate` : "", accent: "#0f766e" },
                { label: "Active Members", value: fmt(stats?.activeMembers), delta: stats ? "and growing" : "", accent: "#7c3aed" },
                { label: "Events This Month", value: fmt(stats?.eventsThisMonth), delta: stats ? `${fmt(stats.upcomingEvents)} upcoming` : "", accent: "#db2777" },
              ].map((s) => (
                <div key={s.label} className="home-stat-card">
                  <div className="home-stat-accent" style={{ background: s.accent }} />
                  <p className="home-stat-value">{s.value}</p>
                  <p className="home-stat-label">{s.label}</p>
                  <p className="home-stat-delta">{s.delta}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="home-main pt-8">
        {/* Activity Ticker */}
        {feedData.length > 0 && (
          <div className="w-full bg-slate-50 dark:bg-[#0b1215] ring-1 ring-slate-100 dark:ring-[#14241d] border border-slate-200 dark:border-[#1e3040]/80 rounded-xl py-3 px-4 overflow-hidden relative select-none flex items-center mb-6 shadow-sm">
            <div className="flex items-center gap-2 bg-[#0f766e] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg z-10 shadow-sm shrink-0 mr-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              Live Pulse
            </div>

            <div className="flex-1 min-w-0 overflow-hidden relative h-6 flex items-center">
              <div className="animate-marquee gap-12 whitespace-nowrap">
                {[...feedData, ...feedData].map((item, idx) => (
                  <div key={`${item._id || idx}-${idx}`} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-[#cbd5e1] font-semibold">
                    <i className="ri-checkbox-circle-fill text-emerald-500 text-[15px]"></i>
                    <span>
                      {activityText(item)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      • {new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Community Drives */}
        {upcomingEvents.length > 0 && (
          <section className="home-section home-section--drives relative z-20 w-full animate-fadeIn">
            <div className="home-section-header home-drives-header flex flex-col md:flex-row justify-between items-center md:items-end text-center md:text-left gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400 mb-1">Community programmes</p>
                <h2 className="text-2xl tracking-tight md:text-[1.65rem] font-bold text-slate-900 dark:text-white">Upcoming cleanup drives</h2>
                <p className="text-slate-500 dark:text-slate-300 text-[13px] mt-1 max-w-xl">
                  Verified neighbourhood events you can join, support, or share with your network.
                </p>
              </div>
              <Link
                href="/cleanup-events"
                className="px-4 py-1.5 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] hover:bg-teal-600 text-slate-700 dark:text-[#cbd5e1] hover:text-white text-[13px] font-semibold rounded-full transition-colors border border-slate-200 dark:border-[#1e3040] hover:border-teal-600 flex items-center gap-2 shrink-0"
              >
                Browse all drives <i className="ri-arrow-right-line" />
              </Link>
            </div>

            <div className="home-events-scroller -mx-4 px-4 md:mx-0 md:px-0">
              {upcomingEvents.map((event) => (
                <div key={event._id || event.id} className="home-event-card-slot">
                  <div className="home-event-card-surface p-5">
                    <div className="w-full h-36 rounded-xl overflow-hidden mb-4 bg-slate-100">
                      <img 
                        src={event.coverImages?.[0] || "/banner2.jpg"} onError={(e) => { if (!e.currentTarget.src.endsWith("/banner2.jpg")) e.currentTarget.src = "/banner2.jpg"; }} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {event.location?.area || "Community Area"}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2 line-clamp-1">
                      {event.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        {new Date(event.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <Link 
                        href={`/cleanup-events/${event._id}`}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                      >
                        Details <i className="ri-arrow-right-line"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Verified Residency & Rewards Bento */}
        <MembershipPromo user={user} displayName={displayName} router={router} />

        {/* Quick Actions (8 cards) */}
        <section className="home-section">
          <h2 className="home-section-title tracking-tight">Quick Actions</h2>
          <div className="home-actions-grid">
            {QUICK_ACTIONS.map((a, i) => (
              <motion.button
                key={a.id}
                onClick={() => {
                  if (a.id === "report") setShowReportModal(true);
                  else router.push(a.path);
                }}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                variants={{
                  initial: { opacity: 0, y: 16 },
                  animate: { opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.2, ease: "easeOut" } },
                  hover: { y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.1)", backgroundColor: a.bg, borderColor: "transparent", transition: { duration: 0.2, ease: "easeOut" } },
                  tap: { scale: 0.98 }
                }}
                className="home-action-card"
              >
                <motion.div
                  className="home-action-icon"
                  variants={{
                    initial: { backgroundColor: a.bg, boxShadow: "none" },
                    animate: { backgroundColor: a.bg, boxShadow: "none", transition: { duration: 0.2, ease: "easeOut" } },
                    hover: { backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: { duration: 0.2, ease: "easeOut" } }
                  }}
                  style={{ color: a.color }}
                >
                  {a.icon}
                </motion.div>
                <div className="home-action-body">
                  <p className="home-action-title">{a.title}</p>
                  <p className="home-action-desc">{a.desc}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" className="home-action-arrow">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title tracking-tight">Recent Activity</h2>
          </div>

          <div className="home-activity-list">
            {feedData.map((item, i) => {
              const meta = TYPE_META[item.type] || TYPE_META_EXTRA[item.type] || {
                bg: "rgba(100, 116, 139, 0.08)",
                color: "#475569",
                border: "rgba(100, 116, 139, 0.15)",
                icon: "ri-notification-line",
                label: "Activity"
              };

              return (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.5) }}
                  className="home-activity-item flex items-start gap-4 py-4 px-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all"
                >
                  <div 
                    className="flex items-center justify-center text-sm shrink-0 w-10 h-10 rounded-xl shadow-sm border"
                    style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    <i className={meta.icon}></i>
                  </div>
                  <div className="home-activity-body flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span 
                        className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                        style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="home-activity-text text-[13px] font-semibold text-slate-700 dark:text-[#cbd5e1] leading-relaxed">
                      <span className="font-bold text-slate-900 dark:text-white">{activityParts(item).actor}</span>{" "}
                      {activityParts(item).rest}
                    </p>
                    <p className="home-activity-meta text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                      <i className="ri-time-line text-[11px]"></i>
                      {new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            {hasMoreFeed && (
              <button 
                onClick={() => setFeedPage((p) => p + 1)}
                disabled={isFeedLoading}
                className="px-6 py-2.5 bg-white text-[#40826D] font-bold rounded-full shadow-sm border border-teal-200 transition-all hover:shadow-md disabled:opacity-50 text-[13px]"
              >
                {isFeedLoading ? "Loading..." : "Load More"} <i className="ri-arrow-down-s-line"></i>
              </button>
            )}
            <Link
              href="/recent-activities"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all text-[13px] group ml-auto"
            >
              <i className="ri-history-line"></i>
              See All Recent Activities
              <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform"></i>
            </Link>
          </div>
        </section>
      </main>

      {/* ── BANNER BOTTOM SLIDER ────────────────────────────────────────── */}
      <Banner />

      {/* ── QUICK REPORT INCIDENT MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2" style={{ fontFamily: 'HKGrotesk, sans-serif' }}>
                    <i className="ri-alert-fill text-yellow-300 animate-pulse"></i> Quick Report Incident
                  </h3>
                  <p className="text-xs text-teal-100 mt-1">Alert the community about cleanliness & public hazards</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleIncidentSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
                {/* Category Selector */}
                <div>
                  <label className="block text-[13px] font-extrabold text-slate-700 dark:text-[#cbd5e1] mb-2">
                    Category <span className="text-red-500 font-black">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "Clogged Drain", icon: "ri-water-flash-line" },
                      { value: "Littering", icon: "ri-delete-bin-6-line" },
                      { value: "Graffiti", icon: "ri-paint-brush-line" },
                      { value: "Illegal Dumping", icon: "ri-spam-line" },
                      { value: "General Waste", icon: "ri-recycle-line" },
                      { value: "Other", icon: "ri-question-mark" },
                    ].map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setIncidentForm((prev) => ({ ...prev, category: cat.value }))}
                        className={`category-select-btn flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[13px] font-bold shadow-sm transition-all ${
                          incidentForm.category === cat.value
                            ? "bg-teal-50 border-teal-500 text-teal-700 shadow-sm ring-1 ring-teal-500/20"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                        }`}
                      >
                        <i className={`${cat.icon} text-[15px]`}></i>
                        <span>{cat.value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[13px] font-extrabold text-slate-700 dark:text-[#cbd5e1] mb-1.5">
                    Incident Title <span className="text-red-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clogged drain causing overflow on main street"
                    value={incidentForm.title}
                    onChange={(e) => setIncidentForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="modal-input-field w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#1e3040] focus:outline-none text-[13px] transition-all placeholder:text-slate-400 font-medium text-slate-800 dark:text-white"
                  />
                </div>

                {/* Area/Location */}
                <div>
                  <label className="block text-[13px] font-extrabold text-slate-700 dark:text-[#cbd5e1] mb-1.5">
                    Area/Location <span className="text-red-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhanmondi, Road 15"
                    value={incidentForm.area}
                    onChange={(e) => setIncidentForm((prev) => ({ ...prev, area: e.target.value }))}
                    className="modal-input-field w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#1e3040] focus:outline-none text-[13px] transition-all placeholder:text-slate-400 font-medium text-slate-800 dark:text-white"
                  />
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">Provide a brief, clear landmark or neighborhood name.</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[13px] font-extrabold text-slate-700 dark:text-[#cbd5e1] mb-1.5">
                    Description <span className="text-red-500 font-black">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the issue in detail (e.g. trash piling up, foul smell, blocked pathway)"
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="modal-input-field w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#1e3040] focus:outline-none text-[13px] transition-all resize-none placeholder:text-slate-400 font-medium text-slate-800 dark:text-white"
                  />
                </div>

                {/* Reporter Name & Anonymous Checkbox */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-extrabold text-slate-700 dark:text-[#cbd5e1]">Reporter Identity</label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={incidentForm.anonymous}
                        onChange={(e) => setIncidentForm((prev) => ({ 
                          ...prev, 
                          anonymous: e.target.checked,
                          reporterName: e.target.checked ? "Anonymous Neighbour" : (user?.displayName || "")
                        }))}
                        className="rounded border-slate-350 text-teal-600 focus:ring-teal-500/20 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-300">Report Anonymously</span>
                    </label>
                  </div>

                  {!incidentForm.anonymous && (
                    <input
                      type="text"
                      placeholder="Your name"
                      value={incidentForm.reporterName}
                      onChange={(e) => setIncidentForm((prev) => ({ ...prev, reporterName: e.target.value }))}
                      className="modal-input-field w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#1e3040] focus:outline-none text-[13px] transition-all font-medium text-slate-800 dark:text-white"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-[#1e3040] hover:bg-slate-50 text-slate-600 text-[13px] font-extrabold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingIncident}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-[13px] font-black rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingIncident ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i> Submitting...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-fill"></i> Submit Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
