"use client";

/** Small shared pieces ported from the original app (FlairPill, StatusBadge, MinimalLoader, BackButton, PremiumDropdown). */
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  "Garbage & Waste": { color: "bg-amber-100 text-amber-800", icon: "ri-delete-bin-line" },
  "Road Damage": { color: "bg-red-100 text-red-800", icon: "ri-road-map-line" },
  Waterlogging: { color: "bg-blue-100 text-blue-800", icon: "ri-water-flash-line" },
  "Illegal Construction": { color: "bg-orange-100 text-orange-800", icon: "ri-building-line" },
  "Broken Public Property": { color: "bg-purple-100 text-purple-800", icon: "ri-hammer-line" },
  "Utility Problems": { color: "bg-yellow-100 text-yellow-800", icon: "ri-lightbulb-flash-line" },
  "Social Problems": { color: "bg-pink-100 text-pink-800", icon: "ri-group-line" },
  "Environmental Issues": { color: "bg-green-100 text-green-800", icon: "ri-leaf-line" },
  "Safety & Crime": { color: "bg-gray-200 text-gray-900", icon: "ri-shield-keyhole-line" },
  "Community Norms": { color: "bg-indigo-100 text-indigo-800", icon: "ri-file-list-3-line" },
  Custom: { color: "bg-slate-100 dark:bg-[#1e3040] text-slate-700 dark:text-[#cbd5e1]", icon: "ri-price-tag-3-line" },
};

export function FlairPill({ category, customFlair }: { category?: string; customFlair?: string | null }) {
  const config = (category && CATEGORY_CONFIG[category]) || CATEGORY_CONFIG.Custom;
  const label = category === "Custom" && customFlair ? customFlair : category || "General";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      <i className={config.icon}></i>
      {label}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  open: { label: "Open", color: "bg-slate-100 dark:bg-[#1e3040] text-slate-500 dark:text-slate-300 border-slate-200 dark:border-[#1e3040]", icon: "ri-lock-unlock-line" },
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-600 border-yellow-200", icon: "ri-time-line" },
  in_review: { label: "In Review", color: "bg-blue-50 text-blue-600 border-blue-200", icon: "ri-search-eye-line" },
  action_taken: { label: "Action Taken", color: "bg-orange-50 text-orange-600 border-orange-200", icon: "ri-tools-line" },
  pending_verification: { label: "Pending Verification", color: "bg-amber-50 text-amber-600 border-amber-200", icon: "ri-shield-check-line" },
  solved: { label: "Solved", color: "bg-green-50 text-green-600 border-green-200", icon: "ri-check-line" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-600 border-red-200", icon: "ri-close-line" },
};

export function StatusBadge({ status }: { status?: string }) {
  const config = (status && STATUS_CONFIG[status]) || STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.color} uppercase tracking-wider`}>
      <i className={config.icon}></i>
      {config.label}
    </span>
  );
}

export function MinimalLoader({ size = "md", color = "#40826D" }: { size?: "sm" | "md" | "lg" | "xl"; color?: string }) {
  const dot = { sm: "w-1.5 h-1.5", md: "w-2.5 h-2.5", lg: "w-4 h-4", xl: "w-5 h-5" }[size];
  const transition = { duration: 0.4, repeat: Infinity, repeatType: "reverse" as const, ease: "easeInOut" as const };
  return (
    <div className="flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={`${dot} rounded-full`}
            style={{ backgroundColor: color }}
            initial={{ y: "0%" }}
            animate={{ y: "-100%" }}
            transition={{ ...transition, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

export function BackButton({ variant = "dark", className = "", children }: { variant?: "light" | "dark"; className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const base =
    "group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-[13px] transition-all duration-300 shadow-sm select-none cursor-pointer z-50 active:scale-[0.97] hover:shadow-md w-max";
  const variants = {
    light: "bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 backdrop-blur-md",
    dark: "bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] border-slate-200 dark:border-[#1e3040] text-slate-700 dark:text-[#cbd5e1] hover:border-[#40826D] hover:text-[#40826D] dark:hover:border-emerald-500 dark:hover:text-emerald-400",
  };
  return (
    <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} className={`${base} ${variants[variant]} ${className}`} title="Go Back">
      <i className="ri-arrow-left-line text-[15px] group-hover:-translate-x-1.5 transition-transform duration-300 ease-out"></i>
      {children || <span className="tracking-tight">Return to Previous</span>}
    </button>
  );
}

export type DropdownOption = { label: string; value: string; icon?: string };

export function PremiumDropdown({
  options,
  value,
  onChange,
  placeholder,
  icon,
  className = "",
}: {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between w-full h-12 px-4 bg-slate-50 dark:bg-[#0b1215] border rounded-lg transition-all duration-200 outline-none cursor-pointer ${
          open ? "bg-white dark:bg-[#0a120e] border-[#40826D] ring-2 ring-[#9FE2BF]/40" : "border-slate-200 dark:border-[#1e3040] hover:bg-white dark:hover:bg-[#0a120e]"
        }`}
      >
        <div className="flex items-center gap-2 text-slate-700 dark:text-[#cbd5e1] font-medium text-[13px] min-w-0">
          {(selected?.icon || icon) && <i className={`${selected?.icon || icon} text-[#0f766e] shrink-0 text-[13px]`} />}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </div>
        <motion.i animate={{ rotate: open ? 180 : 0 }} className="ri-arrow-down-s-line text-slate-400 ml-2 text-[13px] leading-none"></motion.i>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 w-full min-w-[10rem] mt-2 bg-white dark:bg-[#0a120e] backdrop-blur-md border border-slate-200 dark:border-[#1e3040] rounded-lg shadow-xl py-1 overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto custom-scrollbar" role="listbox">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={value === o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    value === o.value ? "text-[#0f766e] font-bold bg-emerald-50/80 dark:bg-emerald-950/30" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0b1215] hover:text-slate-900 dark:hover:text-white font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {o.icon && <i className={`${o.icon} text-[13px] shrink-0 ${value === o.value ? "text-[#0f766e]" : "text-slate-400"}`} />}
                    {o.label}
                  </span>
                  {value === o.value && <i className="ri-check-line text-[#0f766e] text-[13px] leading-none shrink-0"></i>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
