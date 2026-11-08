"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const SECTIONS = [
  {
    id: "purpose",
    shortLabel: "Purpose",
    icon: "ri-book-open-line",
    tone: "bg-teal-50 text-teal-700",
    title: "Purpose of these guidelines",
    body: "CivicNest is a civic platform for reporting issues, organising cleanups, and collaborating respectfully. These rules help keep content accurate, safe, and useful for every resident.",
  },
  {
    id: "posting",
    shortLabel: "Posting",
    icon: "ri-edit-line",
    tone: "bg-teal-50 text-teal-700",
    title: "Posting standards",
    items: [
      "Use clear titles and accurate locations. Do not mislabel areas or duplicate the same issue without reason.",
      "Upload original photos where possible. Stock images or unrelated media may be removed.",
      "Describe what you observed factually. Avoid naming private individuals in public posts unless required for safety.",
      "Cleanup events must include a real date, meeting point, and organiser contact reachable through the platform.",
      "Lost & found and animal posts must follow category-specific fields; incomplete listings may be returned for revision.",
    ],
  },
  {
    id: "rejection",
    shortLabel: "Rejection",
    icon: "ri-close-circle-line",
    tone: "bg-amber-50 text-amber-700",
    title: "When content may be rejected",
    items: [
      "Spam, scams, or repeated low-effort submissions.",
      "Hate speech, harassment, threats, or discriminatory language.",
      "False or misleading reports intended to harm a person, business, or neighbourhood.",
      "Graphic, violent, or sexually explicit material unrelated to civic safety.",
      "Commercial advertising without community value or admin approval.",
      "Personal data published without consent (phone numbers, home addresses, ID documents).",
      "Events that encourage unsafe or illegal activity.",
    ],
  },
  {
    id: "moderation",
    shortLabel: "Moderation",
    icon: "ri-shield-check-line",
    tone: "bg-slate-100 text-slate-700",
    title: "Moderation process",
    body: "Volunteer moderators and administrators review flagged and queued items. You will receive an in-app notice when a post is approved, needs edits, or is rejected—with a short reason when applicable. Repeated violations may limit posting privileges.",
  },
  {
    id: "conduct",
    shortLabel: "Conduct",
    icon: "ri-hand-heart-line",
    tone: "bg-teal-50 text-teal-700",
    title: "Community conduct",
    items: [
      "Treat neighbours, organisers, and moderators with respect—even when you disagree.",
      "Debate ideas, not people. No bullying in comments, forums, or direct outreach.",
      "RSVP responsibly: update your status if you cannot attend a drive you marked as “going”.",
      "Do not coordinate retaliation or “pile-on” campaigns against individuals.",
      "Report concerns through official channels instead of public call-outs when safety is involved.",
    ],
  },
  {
    id: "safety",
    shortLabel: "Safety",
    icon: "ri-lock-line",
    tone: "bg-rose-50 text-rose-700",
    title: "Safety & privacy",
    items: [
      "Meet in public places for handovers and community events when possible.",
      "Never share passwords or payment details in posts or chats.",
      "Use the platform’s reporting tools for urgent hazards; contact local emergency services when life is at risk.",
    ],
  },
];

export default function CommunityGuidelinesPage() {
  const [activeSection, setActiveSection] = useState("purpose");

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#050a08] font-body pb-20">
      <div className="bg-[#0f172a] text-white pt-16 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 mb-6">
            <i className="ri-file-list-3-line" /> Public Resource
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Civic<span className="text-emerald-400">Nest</span> Guidelines
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto">
            How to post responsibly, what moderators expect, and how we keep the community safe for everyone.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-8">
        <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-[#0a120e] p-2 rounded-xl border border-slate-100 dark:border-[#1e3040] shadow-sm">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActiveSection(s.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSection === s.id
                  ? "bg-[#0f766e] text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e3040]"
              }`}
            >
              {s.shortLabel}
            </a>
          ))}
        </div>

        <div className="space-y-5">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.03 }}
              className="scroll-mt-28 rounded-xl border border-slate-100 dark:border-[#1e3040] bg-white dark:bg-[#0a120e] p-5 shadow-sm"
            >
              <div className="mb-4 flex items-start gap-4">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${section.tone}`}>
                  <i className={`${section.icon} text-lg`} />
                </span>
                <h2 className="pt-2 text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">{section.title}</h2>
              </div>
              {section.body && (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[13px] md:pl-[3.5rem]">{section.body}</p>
              )}
              {section.items && (
                <ul className="mt-1 space-y-3 md:pl-[3.5rem] text-[13px]">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                      <i className="ri-checkbox-circle-line shrink-0 text-teal-600 text-[15px] mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-teal-100 dark:border-teal-900/50 bg-teal-50/60 dark:bg-teal-950/30 p-5 text-center">
          <i className="ri-question-line mb-2 block text-2xl text-teal-700 dark:text-teal-400" />
          <p className="text-[13px] text-slate-600 dark:text-slate-300">
            Questions?{" "}
            <Link href="/goals-and-vision" className="font-semibold text-teal-700 dark:text-teal-400 hover:underline">
              Read our goals &amp; vision
            </Link>{" "}
            or contact your city moderator through the app.
          </p>
        </div>
      </div>
    </div>
  );
}

