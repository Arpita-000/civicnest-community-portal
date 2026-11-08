"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollProgressButton() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) setProgress((window.scrollY / total) * 100);
      setIsVisible(window.scrollY > 300);
      ticking.current = false;
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (typeof window !== "undefined" && (window as any).lenis) {
              (window as any).lenis.scrollTo(0, { duration: 1.0 });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          aria-label="Scroll to top"
          className="fixed bottom-28 right-8 z-40 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-[0_8px_30px_rgba(15,118,110,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 border border-slate-200/50 dark:border-[#1e3040]/50 bg-white/90 dark:bg-[#0a120e]/95 backdrop-blur-md"
        >
          <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 50 50">
            <circle className="text-slate-100 dark:text-[#14241d]" strokeWidth="2.5" stroke="currentColor" fill="transparent" r={radius} cx="25" cy="25" />
            <circle
              className="text-[#0f766e] dark:text-emerald-500 transition-all duration-100"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="25"
              cy="25"
            />
          </svg>
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <AnimatePresence mode="wait">
              {isHovered ? (
                <motion.span key="percent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }} className="text-[10px] font-extrabold text-[#0f766e] dark:text-emerald-400 font-mono tracking-tighter">
                  {Math.round(progress)}%
                </motion.span>
              ) : (
                <motion.i key="arrow" initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.15 }} className="ri-arrow-up-line text-lg text-slate-700 dark:text-slate-200" />
              )}
            </AnimatePresence>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
