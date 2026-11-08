"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const ALL_MANUAL_ITEMS = [
  {
    tab: "Guests",
    title: "Browse without an account",
    anchor: "guest-browse",
    content: `What you can do without an account:
✓ Browse all approved cleanliness issues on the interactive map and list view.
✓ View community announcements and critical safety warnings on the Noticeboard.
✓ See the Leaderboard to check who's helping most and see active neighborhood cleanups.
✓ Browse upcoming community cleanup events and volunteer opportunities.
✓ View the Before & After Gallery showcasing successful local cleanup transformations.`,
  },
  {
    tab: "Guests",
    title: "Actions requiring registration",
    anchor: "guest-account",
    content: `What requires an account to interact:
✗ Reporting new civic issues, animal care needs, or lost & found listings.
✗ Upvoting issues, commenting on posts, or verifying resolved issues.
✗ Joining volunteer cleanup drives or RSVPing to stray feeding events.
✗ Accessing the CivicBot AI assistant for smart guidance.`,
  },
  {
    tab: "Guests",
    title: "How to register a new account",
    anchor: "guest-register",
    content: `To join our civic nest:
1. Click the "Log in" or "Join Us" button in the top right of the navigation bar.
2. Enter your name, email address, and select a strong password.
3. Verify password rules: must contain uppercase, lowercase, and be at least 6 characters long.
4. Note: You start as a Guest role — you can apply for Residency Verification / Membership from your Profile to unlock full member credits.`,
  },
  {
    tab: "Members",
    title: "The Credit System (Read This First)",
    anchor: "credits",
    content: `Credits protect the community feed and prevent spam:
• You receive 3 issue credits per 72 hours (not per calendar day).
• Each credit unlocks exactly 72 hours after the post that consumed it.
• Rejected posts do NOT consume your credits (credits are refunded). Pending posts DO hold a credit.
• Registered Volunteers receive 5 credits. Users with 500+ contribution points receive a +1 bonus credit.`,
  },
  {
    tab: "Members",
    title: "How to Report a Cleanliness Issue",
    anchor: "report-issue",
    content: `Reporting a new cleanup task step-by-step:
1. Click "Report Incident" from the navbar or Homepage quick action cards.
2. Write a clear title and detailed description.
3. Select the correct category (Garbage, Road Damage, Waterlogging, Broken Property, Safety).
4. Provide the ward/area and location coordinates.
5. Upload a clear, original photo of the issue (required for admin approval).
6. Submit — your issue goes directly to the admin review queue.`,
  },
  {
    tab: "Members",
    title: "How the Resolution System Works",
    anchor: "resolution",
    content: `Resolving and verifying issues:
1. An admin or an active community member "claims" your reported issue to go fix it.
2. They upload before/after proof photos once the site is clean.
3. THREE community members must click "Verify Fix" to confirm the resolution.
4. Once all 3 verifications are submitted, the status shifts to "Solved", points are awarded, and escrow is released.
5. You earn +25 contribution points when your reported issue is successfully resolved.`,
  },
  {
    tab: "Members",
    title: "Lost & Found Guidelines",
    anchor: "lost-found",
    content: `Reuniting items in public spaces:
• Lost Item: You post details of a lost item. Finders click "I Found This" and describe where/when they retrieved it.
• Found Item: You post a found item. Owners click "I Think This Is Mine" and provide unique identifying proof.
• Note: Only the ORIGINAL POSTER of the lost/found item can mark the listing as Reunited.`,
  },
  {
    tab: "Volunteers",
    title: "Registering as a Volunteer",
    anchor: "volunteer-register",
    content: `To step up as a community volunteer:
1. Navigate to the Volunteer Hub in the navigation bar.
2. Click "Join as Volunteer" to register.
3. Select your specialized skills, availability times, and target neighborhood/area.
4. Once approved, you gain access to the Volunteer Dashboard and automatically receive a 2x points multiplier on all civic actions!`,
  },
  {
    tab: "Volunteers",
    title: "The 2x Points Multiplier",
    anchor: "volunteer-multiplier",
    content: `As a volunteer, your engagement is rewarded double:
• Reporting civic issues
• Verifying reported fixes
• RSVPing & attending cleanup events
• Making financial contributions
• Adding eyewitness/witness reports`,
  },
  {
    tab: "Volunteers",
    title: "Event Check-in Code & GPS Verification",
    anchor: "event-checkin",
    content: `Checking in at volunteer events:
1. You must RSVP to the cleanup event first (click "Going").
2. At the event location, ask the event organizer for the 6-digit check-in code.
3. Enter the code in the event page or your Volunteer Dashboard.
4. Checking in awards 30 points to standard members and 60 points to registered volunteers.`,
  },
  {
    tab: "Common Mistakes",
    title: "Using all 3 credits on the same issue",
    anchor: "mistake-credits",
    content: `If your first report isn't approved immediately, do NOT submit the same issue twice more.
Wait for admin review feedback. Re-submitting uses up your credits and delays actual resolution.`,
  },
  {
    tab: "Common Mistakes",
    title: "Vague location descriptions",
    anchor: "mistake-location",
    content: `Providing descriptions like "Near the local market" fails quality checks.
Always mark exact coordinates and add clear landmarks in the address field.
Correct: "Opposite Shohid Minar, Road 7, Mirpur 10".`,
  },
  {
    tab: "Common Mistakes",
    title: "Ignoring the Streak reset rules",
    anchor: "mistake-streak",
    content: `Missing one day of community participation resets your contribution streak.
Qualifying daily actions include: casting a poll vote, upvoting an issue, writing a comment, or verifying a fix.
You do NOT need to post a new issue every day to maintain a streak.`,
  },
];

const TABS = ["Guests", "Members", "Volunteers", "Common Mistakes"];

export default function UserManualPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Guests");
  const [openSection, setOpenSection] = useState<string | null>("guest-browse");

  const itemsToDisplay = search.trim()
    ? ALL_MANUAL_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.content.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_MANUAL_ITEMS.filter((item) => item.tab === activeTab);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#050a08] font-body pb-20">
      <div className="bg-[#0f172a] text-white pt-16 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 mb-6">
            <i className="ri-book-open-line" /> Official Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            CivicNest <span className="text-emerald-400">User Manual</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto mb-8">
            Complete reference guide for residents, members, and volunteers on credits, reporting, verification, and civic points.
          </p>

          <div className="max-w-xl mx-auto relative">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics (e.g. credits, verify, volunteer, streak)..."
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm outline-none focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-10">
        {!search.trim() && (
          <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-[#0a120e] p-2 rounded-xl border border-slate-200 dark:border-[#1e3040] shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#0f766e] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e3040]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {itemsToDisplay.map((item) => {
            const isOpen = openSection === item.anchor || !!search.trim();
            return (
              <div
                key={item.anchor}
                className="bg-white dark:bg-[#0a120e] rounded-xl border border-slate-200 dark:border-[#1e3040] overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenSection(isOpen ? null : item.anchor)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0b1215] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 text-[10px] font-bold uppercase tracking-wider">
                      {item.tab}
                    </span>
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  </div>
                  <i className={`ri-arrow-${isOpen ? "up" : "down"}-s-line text-slate-400 text-lg`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-[#1e3040] text-[13px] text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {item.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl bg-gradient-to-r from-[#0f766e] to-emerald-700 p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <h3 className="text-base font-bold">Still have questions about CivicNest?</h3>
            <p className="text-xs text-emerald-100 mt-1">Ask CivicBot AI for instant help with reporting, rules, or complaint letters.</p>
          </div>
          <Link
            href="/ai-assistant"
            className="px-5 py-2.5 rounded-xl bg-white text-[#0f766e] text-xs font-extrabold shadow-sm hover:bg-emerald-50 transition-all shrink-0"
          >
            Ask CivicBot AI →
          </Link>
        </div>
      </div>
    </div>
  );
}

