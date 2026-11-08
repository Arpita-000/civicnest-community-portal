"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const BANNER_IMAGES = [
  "/banner1.png",
  "/banner2.jpg",
  "/banner3.jpg",
  "/banner4.png"
];

const PHRASES = [
  "Join The Nest",
  "Make An Impact",
  "Unite The City"
];

export default function Banner() {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  // Background slider loop every 4 seconds
  useEffect(() => {
    const imgInterval = setInterval(() => {
      setCurrentImgIdx((prev) => (prev + 1) % BANNER_IMAGES.length);
    }, 4000);
    return () => clearInterval(imgInterval);
  }, []);

  // Typewriter effect matching react-simple-typewriter in original
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = PHRASES[phraseIdx];
    const speed = isDeleting ? 50 : 80;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (typedText.length < fullText.length) {
          setTypedText(fullText.slice(0, typedText.length + 1));
        } else {
          // Pause 2000ms at end before deleting
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (typedText.length > 0) {
          setTypedText(fullText.slice(0, typedText.length - 1));
        } else {
          setIsDeleting(false);
          setPhraseIdx((p) => (p + 1) % PHRASES.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, phraseIdx]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you for joining the movement! Check your inbox.");
  };

  return (
    <section className="relative w-full overflow-hidden min-h-[450px] flex items-center justify-center">
      {/* Background Image Slider with Cross-Fade */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentImgIdx}
            src={BANNER_IMAGES[currentImgIdx]}
            alt={`Banner ${currentImgIdx + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f766e]/80 to-transparent z-10 pointer-events-none"></div>
      </div>

      <div className="relative z-20 w-full max-w-5xl mx-auto px-6 py-12 lg:py-12 flex flex-col items-start justify-end h-full text-white">
        <div className="w-full">
          <p className="font-label text-[13px] uppercase tracking-widest font-bold mb-4 text-[#9FE2BF]">
            The Movement
          </p>

          <h2
            className="font-display text-4xl tracking-tight md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 text-white uppercase min-h-[80px]"
            style={{ letterSpacing: "-0.04em" }}
          >
            {typedText}
            <span className="animate-pulse">_</span>
          </h2>

          <div className="flex flex-wrap items-center gap-4 mb-8">
            <span className="font-bold text-[13px] text-white/80">I&apos;m interested in:</span>
            <button
              type="button"
              className="px-5 py-2 rounded-full border border-white/40 hover:bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] transition-colors backdrop-blur-sm text-[13px] font-bold shadow-sm cursor-pointer"
            >
              Cleanups
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded-full border border-white/40 hover:bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] transition-colors backdrop-blur-sm text-[13px] font-bold shadow-sm cursor-pointer"
            >
              Funding
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded-full border border-white/40 hover:bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] transition-colors backdrop-blur-sm text-[13px] font-bold shadow-sm cursor-pointer"
            >
              Community Events
            </button>
          </div>

          <form onSubmit={handleSubmit} className="w-full relative group max-w-2xl">
            <input
              className="w-full bg-transparent border-b-2 border-white/40 focus:border-white text-2xl tracking-tight md:text-4xl tracking-tight font-display font-bold py-4 px-0 placeholder-white/50 focus:outline-none focus:ring-0 transition-colors uppercase tracking-tight"
              placeholder="ENTER YOUR EMAIL"
              required
              type="email"
            />
            <button
              className="absolute right-0 bottom-4 w-12 h-12 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] text-[#0f766e] rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300 shadow-lg cursor-pointer"
              type="submit"
            >
              <i className="ri-arrow-right-line text-[13px] tracking-tight font-bold"></i>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
