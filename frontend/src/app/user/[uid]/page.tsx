"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "../../../lib/api";
import SocialFeedCard from "../../../components/SocialFeedCard";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function PublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([api.get(`/public/users/${uid}`), api.get(`/public/users/${uid}/issues`)])
      .then(([p, i]) => {
        if (!alive) return;
        setProfile(p.data.data);
        setIssues(i.data.data || []);
      })
      .catch((err) => alive && setError(err?.response?.status === 404 ? "This user might have been removed or doesn't exist." : "Failed to load profile"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [uid]);

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <MinimalLoader />
      </div>
    );

  if (error || !profile)
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] p-5 rounded-xl shadow-sm text-center max-w-md w-full border border-slate-100 dark:border-[#14241d]">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            <i className="ri-user-unfollow-line"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-500 dark:text-slate-300 mb-6">{error || "This user might have been removed or doesn't exist."}</p>
          <Link href="/" className="btn bg-[#028090] text-white hover:bg-[#026c7a] rounded-full px-6">
            Go Back Home
          </Link>
        </div>
      </div>
    );

  return (
    <div className="pb-20">
      <div className="w-full h-[250px] md:h-[350px] relative bg-slate-200 dark:bg-[#14241d]">
        <div className="absolute top-6 left-6 z-30">
          <BackButton variant="light" />
        </div>
        <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-20 md:-mt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-5 items-center md:items-end relative border border-slate-100/60 dark:border-[#14241d] backdrop-blur-xl">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-[#0a120e] overflow-hidden bg-slate-100 dark:bg-[#1e3040] shadow-lg flex-shrink-0 relative z-10 -mt-16 md:-mt-20">
            {profile.photoURL ? <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div className="w-full h-full flex items-center justify-center text-4xl text-slate-400"><i className="ri-user-smile-line"></i></div>}
          </div>

          <div className="flex-grow text-center md:text-left pt-2 md:pt-0">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
              {profile.name}
              {profile.role === "admin" && <i className="ri-verified-badge-fill text-[#028090] text-2xl" title="Admin"></i>}
            </h1>
            <div className="text-slate-500 dark:text-slate-300 font-medium mt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="capitalize px-3 py-1 bg-slate-100 dark:bg-[#1e3040] rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">{profile.role}</span>
              {profile.area && (
                <span className="flex items-center gap-1 text-[13px] bg-slate-50 dark:bg-[#0b1215] px-2.5 py-1 rounded-md border border-slate-100 dark:border-[#14241d] text-slate-600 dark:text-slate-300">
                  <i className="ri-map-pin-line text-[#028090]"></i> {profile.area}
                </span>
              )}
              {profile.joinedAt && (
                <span className="flex items-center gap-1 text-[13px] px-2.5 py-1">
                  <i className="ri-calendar-line"></i> Joined {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <p className="mt-4 text-slate-700 dark:text-[#cbd5e1] leading-relaxed max-w-2xl text-[15px]">{profile.bio}</p>
          </div>

          <div className="hidden lg:flex flex-col gap-4 min-w-[200px]">
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40 text-center">
              <p className="text-emerald-900 dark:text-emerald-200 font-black text-2xl tracking-tight">{profile.points}</p>
              <p className="text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-widest mt-1">Civic Points</p>
            </div>
          </div>
        </motion.div>

        <div className="lg:hidden mt-6 grid grid-cols-2 gap-4">
          <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40 text-center shadow-sm">
            <p className="text-emerald-900 dark:text-emerald-200 font-black text-2xl tracking-tight">{profile.points}</p>
            <p className="text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-widest mt-1">Civic Points</p>
          </div>
          <div className="bg-[#028090]/10 p-4 rounded-lg border border-[#028090]/20 text-center shadow-sm">
            <p className="text-[#028090] font-black text-2xl tracking-tight">{issues.length}</p>
            <p className="text-[#026c7a] dark:text-[#5eead4] text-xs font-bold uppercase tracking-widest mt-1">Public Posts</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-5">
          <div className="lg:w-2/3">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#1e3040] flex items-center justify-center text-slate-600 dark:text-slate-300">
                <i className="ri-history-line"></i>
              </div>
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight">Activity Feed</h3>
            </div>
            {issues.length > 0 ? (
              <div className="space-y-6">
                {issues.map((issue) => (
                  <SocialFeedCard key={issue._id} issue={{ ...issue, _type: "issue" }} />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] p-12 rounded-xl border border-slate-100 dark:border-[#14241d] text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 dark:bg-[#0b1215] text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                  <i className="ri-file-list-3-line"></i>
                </div>
                <h3 className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1] mb-2">No Public Posts Yet</h3>
                <p className="text-slate-500 dark:text-slate-300 max-w-sm mx-auto">This user hasn&apos;t submitted any public issues that have been approved by admins.</p>
              </div>
            )}
          </div>

          <div className="lg:w-1/3">
            <div className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl shadow-sm border border-slate-100 dark:border-[#14241d] p-4 sticky top-24">
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-white mb-4 pb-4 border-b border-slate-100 dark:border-[#14241d] flex items-center gap-2 tracking-tight">
                <i className="ri-medal-fill text-[#f4d35e]"></i> Achievements
              </h3>
              <ul className="space-y-4">
                {profile.isVolunteer && (
                  <li className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center border border-teal-100 dark:border-teal-900/40 text-teal-600">
                      <i className="ri-heart-3-fill"></i>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Community Volunteer</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Approved volunteer force member</p>
                    </div>
                  </li>
                )}
                <li className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-[#0b1215] flex items-center justify-center border border-slate-100 dark:border-[#14241d] text-[#028090]">
                    <i className="ri-megaphone-fill"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{issues.length} Issues Reported</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Active community watcher</p>
                  </div>
                </li>
                {profile.points > 100 && (
                  <li className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 text-amber-500">
                      <i className="ri-vip-crown-fill"></i>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Century Club</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Earned over 100 Civic Points</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
