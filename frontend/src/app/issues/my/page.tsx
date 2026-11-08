"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import SocialFeedCard from "../../../components/SocialFeedCard";
import { BackButton, MinimalLoader } from "../../../components/ui";

export default function MyIssuesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { data } = await api.get("/issues/my", { fresh: true });
      setIssues(Array.isArray(data) ? data : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/login");
    load();
  }, [loading, user, router, load]);

  return (
    <div className="w-full pb-24 pt-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackButton variant="dark" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl tracking-tight font-extrabold bg-gradient-to-r from-teal-800 to-[#1e5844] dark:from-teal-300 dark:to-emerald-400 bg-clip-text text-transparent inline-block">My Reports</h2>
            <p className="text-slate-700 dark:text-[#cbd5e1] font-medium text-[13px] mt-0.5">Track the status of civic issues you have reported.</p>
          </div>
          <Link href="/issues/add" className="btn bg-[#40826D] hover:bg-[#326756] text-white border-none shadow-md rounded-full px-6">
            <i className="ri-add-line"></i> Report New
          </Link>
        </div>

        {state === "loading" ? (
          <div className="flex justify-center items-center py-12">
            <MinimalLoader />
          </div>
        ) : state === "error" ? (
          <div className="text-center py-10 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40 max-w-2xl mx-auto shadow-inner">
            <h3 className="text-[13px] font-bold text-red-700 dark:text-red-300">Unable to load reports</h3>
            <p className="text-red-500 mt-2">There was an error communicating with the server.</p>
            <button onClick={load} className="mt-4 px-6 py-2 text-[13px] font-bold text-white bg-[#0f766e] rounded-full cursor-pointer">
              Try again
            </button>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-[#0b1215] rounded-xl border border-slate-100 dark:border-[#14241d] max-w-2xl mx-auto shadow-inner">
            <div className="w-20 h-20 bg-white dark:bg-[#0a120e] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 dark:border-[#14241d]">
              <i className="ri-file-add-line text-3xl tracking-tight text-slate-300"></i>
            </div>
            <h3 className="text-[13px] font-bold text-slate-700 dark:text-[#cbd5e1]">No issues reported yet</h3>
            <p className="text-slate-500 dark:text-slate-300 mt-2 mb-6">You haven&apos;t reported any civic problems. Help your community by bringing attention to local issues.</p>
            <Link href="/issues/add" className="btn bg-white dark:bg-[#0a120e] border border-slate-200 dark:border-[#1e3040] text-slate-700 dark:text-[#cbd5e1] rounded-full px-6 shadow-sm">
              Start Reporting
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {issues.map((issue) => (
              <SocialFeedCard key={issue._id} issue={{ ...issue, _type: "issue" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
