"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: "ri-map-pin-line", color: "bg-teal-50 text-teal-700", title: "Issue reporting", desc: "Geo-tagged reports with photos, status tracking, and resolver updates." },
  { icon: "ri-calendar-event-line", color: "bg-emerald-50 text-emerald-700", title: "Cleanup drives", desc: "Organise and join neighbourhood cleanups with RSVP and volunteer counts." },
  { icon: "ri-hand-heart-line", color: "bg-amber-50 text-amber-700", title: "Micro-funding", desc: "Support approved drives with transparent contribution goals." },
  { icon: "ri-group-line", color: "bg-violet-50 text-violet-700", title: "Volunteer hub", desc: "Register skills, join programmes, and earn recognition on the leaderboard." },
  { icon: "ri-chat-3-line", color: "bg-sky-50 text-sky-700", title: "Community forum", desc: "Discuss local priorities, share tips, and coordinate with neighbours." },
  { icon: "ri-building-4-line", color: "bg-rose-50 text-rose-700", title: "NGO directory", desc: "Connect with partners who run feeding, shelter, and environmental programmes." },
];

const PROGRAMS = [
  {
    year: "2019",
    title: "CivicNest foundation",
    desc: "Pilot launched in Dhaka with ward-level litter reporting and weekend park cleanups.",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=900&auto=format&fit=crop&q=80",
  },
  {
    year: "2021",
    title: "Neighbourhood drive network",
    desc: "Expanded to Chittagong and Khulna; 200+ volunteer-led drives documented on-platform.",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=900&auto=format&fit=crop&q=80",
  },
  {
    year: "2023",
    title: "Digital stewardship programme",
    desc: "Introduced moderation queue, NGO partnerships, and civic points for contributors.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&auto=format&fit=crop&q=80",
  },
  {
    year: "2025",
    title: "Integrated civic platform",
    desc: "Unified issues, animals, lost & found, polls, and cleanup funding in one resident portal.",
    image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=900&auto=format&fit=crop&q=80",
  },
];

const VISION = [
  {
    period: "2026–2027",
    icon: "ri-road-map-line",
    text: "City-wide moderation SLAs, multilingual guides, and open data exports for partner municipalities.",
  },
  {
    period: "2028–2030",
    icon: "ri-rocket-line",
    text: "Regional federation of “Nests”, predictive hotspot mapping, and youth stewardship curricula in schools.",
  },
];

export default function GoalsVisionPage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#050a08] font-body pb-24">
      <div className="bg-[#0f172a] text-white pt-16 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 mb-6">
            <i className="ri-plant-line" /> About CivicNest
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Building a cleaner, <span className="text-emerald-400">greener tomorrow</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-lg max-w-2xl mx-auto">
            Discover the story behind CivicNest, our core community programmes, and our bold vision for the future of urban stewardship.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-6 pt-10">
        <motion.section
          id="story"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="scroll-mt-24 grid items-center gap-6 rounded-[1.75rem] border border-teal-100/80 dark:border-[#1e3040] bg-white dark:bg-[#0a120e] p-6 shadow-sm md:grid-cols-2 md:p-10"
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <i className="ri-seedling-line text-lg" />
              </span>
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">Our foundation</h2>
            </div>
            <p className="mb-4 text-2xl font-bold leading-snug text-slate-900 dark:text-white">
              Built by residents who believed cleaner streets start with shared accountability.
            </p>
            <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300 text-[13px]">
              CivicNest began as a volunteer project to replace scattered social-media posts with one trusted place to report problems, celebrate fixes, and organise action. Today we partner with NGOs, student groups, and local administrators—without replacing official city services.
            </p>
            <Link
              href="/community-guidelines"
              className="inline-flex items-center gap-2 text-[13px] font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              <i className="ri-file-list-3-line" />
              Read CivicNest guidelines
              <i className="ri-arrow-right-line" />
            </Link>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-100 dark:border-[#1e3040] bg-teal-50 shadow-md">
            <img
              src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=900&auto=format&fit=crop&q=80"
              alt="Community volunteers at a neighbourhood cleanup"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.section>

        <section>
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <i className="ri-apps-line text-lg" />
            </span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">What we offer</h2>
            <p className="mx-auto mt-2 max-w-xl text-[13px] text-slate-500 dark:text-slate-300">
              Tools designed for everyday civic participation—not just one-off campaigns.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-100 dark:border-[#1e3040] bg-white dark:bg-[#0a120e] p-5 transition-colors hover:border-teal-200 hover:shadow-sm"
              >
                <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                  <i className={`${f.icon} text-lg`} />
                </span>
                <h3 className="mb-1 font-bold text-slate-900 dark:text-white tracking-tight">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Programmes over the years</h2>
            <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-300">Selected milestones from our community work.</p>
          </div>
          <div className="space-y-8">
            {PROGRAMS.map((prog, i) => (
              <motion.article
                key={prog.year}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col items-center gap-6 md:flex-row ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
              >
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-100 dark:border-[#1e3040] bg-slate-100 dark:bg-[#1e3040] shadow-sm md:w-1/2">
                  <img
                    src={prog.image}
                    alt={prog.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes("1559027615")) {
                        target.src = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=900&auto=format&fit=crop&q=80";
                      }
                    }}
                  />
                </div>
                <div className="md:w-1/2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 dark:bg-teal-950/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                    <i className="ri-calendar-line" />
                    {prog.year}
                  </span>
                  <h3 className="mt-2 mb-2 text-lg font-bold text-slate-900 dark:text-white tracking-tight">{prog.title}</h3>
                  <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-[13px]">{prog.desc}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#0f172a] p-6 md:p-12 shadow-2xl border border-slate-800">
          <div className="relative z-10">
            <div className="mb-10 flex flex-col items-center justify-center text-center">
              <span className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2.5 text-[13px] font-bold tracking-[0.1em] uppercase shadow-xl text-emerald-300">
                <i className="ri-eye-line text-[13px]" />
                Vision for the years ahead
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {VISION.map((v) => (
                <div
                  key={v.period}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
                >
                  <span className="mb-4 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-emerald-400">
                    <i className={`${v.icon} text-[13px]`} />
                    {v.period}
                  </span>
                  <p className="leading-relaxed text-slate-300 font-medium text-[13px]">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

