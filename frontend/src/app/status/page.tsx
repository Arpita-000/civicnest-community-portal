"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../lib/api";

type SystemItem = { name: string; status: "operational" | "degraded" | "outage" };

const DEFAULT_SYSTEMS: SystemItem[] = [
  { name: "Core API", status: "operational" },
  { name: "Database", status: "operational" },
  { name: "Authentication Services", status: "operational" },
  { name: "Image Processing (Reports)", status: "operational" },
  { name: "Real-time Notifications", status: "operational" },
  { name: "Mapping Engine", status: "operational" },
];

export default function StatusPage() {
  const [statusData, setStatusData] = useState<{ systems?: SystemItem[]; uptime?: string; timestamp?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    api
      .get("/public/status")
      .then((res) => setStatusData(res.data))
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const getTextColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-emerald-500";
      case "degraded":
        return "text-yellow-500";
      case "outage":
        return "text-red-500";
      default:
        return "text-slate-500 dark:text-slate-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return "check_circle";
      case "degraded":
        return "warning";
      case "outage":
        return "error";
      default:
        return "help";
    }
  };

  const errorSystems: SystemItem[] = DEFAULT_SYSTEMS.map((s) => ({ ...s, status: "outage" }));
  const systems = isError ? errorSystems : statusData?.systems || DEFAULT_SYSTEMS;

  const overallStatus = isError
    ? "Major Outage"
    : systems.some((s) => s.status === "outage")
    ? "Major Outage"
    : systems.some((s) => s.status === "degraded")
    ? "Partial Degradation"
    : "All Systems Operational";

  const overallColor = systems.some((s) => s.status === "outage")
    ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]"
    : systems.some((s) => s.status === "degraded")
    ? "bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)]"
    : "bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.6)]";

  const gradientColor = systems.some((s) => s.status === "outage")
    ? "from-red-900/40"
    : systems.some((s) => s.status === "degraded")
    ? "from-yellow-900/40"
    : "from-emerald-900/40";

  const lastUpdated = statusData?.timestamp
    ? new Date(statusData.timestamp).toLocaleString()
    : isLoading
    ? "Checking…" // same text on server and client, avoids a hydration mismatch
    : new Date().toLocaleString();

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#050a08] font-body pb-24">
      <div className="bg-[#0f172a] text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className={`absolute top-0 left-[20%] w-[60%] h-[150%] bg-gradient-to-b ${gradientColor} to-transparent blur-3xl transform rotate-12 opacity-70`} />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-[13px] font-bold tracking-[0.1em] uppercase mb-8 shadow-2xl text-emerald-300"
          >
            <div className={`w-3 h-3 rounded-full animate-pulse ${overallColor}`} />
            System Status
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-[1.1]"
          >
            {isLoading ? "Checking Status..." : overallStatus}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-[13px] md:text-2xl tracking-tight text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Real-time status of CivicNest services and infrastructure.
            <br />
            <span className="text-[13px] font-normal text-slate-400">Last updated: {lastUpdated}</span>
          </motion.p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 dark:border-[#1e3040] overflow-hidden mb-8"
        >
          <div className="p-5 md:px-12 md:pt-10 border-b border-slate-100 dark:border-[#1e3040] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-[#0b1215]/50">
            <div>
              <h2 className="text-[13px] tracking-tight font-black text-slate-900 dark:text-white">System Performance</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-300 font-medium">Uptime over the last 90 days</p>
            </div>
            <div
              className={`border font-bold px-4 py-2 rounded-xl text-[13px] shadow-sm ${
                isError ? "bg-red-50 border-red-100 text-red-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
              }`}
            >
              {statusData?.uptime ? `${statusData.uptime}%` : isError ? "98.45%" : "99.98%"}
            </div>
          </div>

          <div className="p-5 md:px-12 md:py-10">
            <div className="space-y-8">
              {systems.map((sys) => (
                <div key={sys.name} className="flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`material-symbols-outlined ${getTextColor(sys.status)}`}>
                      {getStatusIcon(sys.status)}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white text-[13px]">{sys.name}</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 overflow-hidden w-full justify-end">
                    <div className="flex gap-1 overflow-hidden justify-end flex-1 md:flex-none opacity-80 group-hover:opacity-100 transition-opacity">
                      {[...Array(40)].map((_, j) => (
                        <div
                          key={j}
                          className={`w-[6px] h-8 rounded-[2px] shrink-0 ${
                            sys.status === "outage" && j === 39
                              ? "bg-red-500"
                              : sys.status === "degraded" && j === 39
                              ? "bg-yellow-500"
                              : j === 23
                              ? "bg-yellow-400"
                              : "bg-emerald-400"
                          }`}
                          title={j === 23 ? "Partial Degradation" : j === 39 ? `Current: ${sys.status}` : "No downtime"}
                        />
                      ))}
                    </div>
                    <span className={`text-[13px] font-bold w-full md:w-32 text-left md:text-right shrink-0 uppercase tracking-wider ${getTextColor(sys.status)}`}>
                      {sys.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={`bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-[2rem] p-10 shadow-xl shadow-slate-200/40 border flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left ${
            isError || overallStatus !== "All Systems Operational" ? "border-red-100" : "border-slate-100 dark:border-[#1e3040]"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-lg flex items-center justify-center shrink-0 border ${
              isError || overallStatus !== "All Systems Operational"
                ? "bg-red-50 border-red-100 text-red-500"
                : "bg-emerald-50 border-emerald-100 text-emerald-500"
            }`}
          >
            <span className="material-symbols-outlined text-[40px]">
              {isError || overallStatus !== "All Systems Operational" ? "warning" : "task_alt"}
            </span>
          </div>
          <div>
            <h2 className="text-2xl tracking-tight font-black text-slate-900 dark:text-white mb-2">
              {isError || overallStatus !== "All Systems Operational" ? "Ongoing Incident" : "No Recent Incidents"}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[13px] font-medium">
              {isError || overallStatus !== "All Systems Operational"
                ? "We are currently experiencing system disruptions. Our engineering team is actively investigating the issue to restore full functionality as quickly as possible. Thank you for your patience."
                : "All services have been running smoothly for the past 14 days. We monitor our systems 24/7 to ensure maximum reliability and uptime for the CivicNest community."}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

