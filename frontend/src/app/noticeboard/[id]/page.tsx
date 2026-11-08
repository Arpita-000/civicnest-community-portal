"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";

export default function NoticeDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/announcements/${id}`)
      .then((res) => setNotice(res.data))
      .catch(() => setNotice(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f4] dark:bg-[#050907] py-16 px-4 flex justify-center">
        <div className="w-full max-w-3xl h-64 rounded-2xl bg-white dark:bg-[#0a120e] animate-pulse" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-[#f4f7f4] dark:bg-[#050907] py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Notice Not Found</h2>
        <Link href="/noticeboard" className="inline-block mt-4 text-teal-500 font-semibold">
          ← Back to Noticeboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f4] dark:bg-[#050907] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/noticeboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline mb-6"
        >
          <i className="ri-arrow-left-line"></i> Back to Noticeboard
        </Link>

        <article className="bg-white dark:bg-[#0a120e] rounded-2xl p-6 sm:p-10 border border-slate-200/80 dark:border-[#14241d] shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(notice.isPinned || notice.pinned) && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500 text-white">
                <i className="ri-pushpin-2-fill mr-1"></i>Pinned
              </span>
            )}
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold capitalize bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {notice.type}
            </span>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {notice.urgency || notice.priority || "normal"}
            </span>
            {(notice.targetArea || notice.affectedArea) && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <i className="ri-map-pin-line"></i> {notice.targetArea || notice.affectedArea}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
            {notice.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pb-6 mb-6 border-b border-slate-100 dark:border-[#14241d]">
            <span>
              <i className="ri-user-line mr-1"></i>Posted by {notice.posterName || notice.createdBy?.name || notice.postedBy || "Admin"}
            </span>
            <span>
              <i className="ri-calendar-line mr-1"></i>
              {new Date(notice.createdAt || notice.date || Date.now()).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>
              <i className="ri-eye-line mr-1"></i>
              {notice.views || 0} views
            </span>
          </div>

          {(notice.bannerImage || notice.attachmentUrl) && (
            <img
              src={notice.bannerImage || notice.attachmentUrl}
              alt={notice.title}
              className="w-full max-h-96 object-cover rounded-xl mb-6 border border-slate-100 dark:border-[#14241d]"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}

          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed text-sm sm:text-base">
            {notice.description || notice.content}
          </div>
        </article>
      </div>
    </div>
  );
}

