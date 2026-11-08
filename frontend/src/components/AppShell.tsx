"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollProgressButton from "./ScrollProgressButton";
import FloatingCivicBot from "./FloatingCivicBot";
import HelpNotification from "./HelpNotification";
import TopProgressBar from "./TopProgressBar";
import { useTheme } from "../hooks/useTheme";

const TITLES: Record<string, string> = {
  "/": "Home",
  "/issues": "Active Incident Reports",
  "/issues/add": "Report an Incident",
  "/issues/my": "My Reported Incidents",
  "/profile": "My Profile",
  "/polls": "Community Polls",
  "/login": "Log in",
  "/register": "Create account",
};

function pageTitle(path: string) {
  if (TITLES[path]) return TITLES[path];
  if (path.startsWith("/issues/")) return "Incident Details";
  if (path.startsWith("/user/")) return "User Public Profile";
  if (path.startsWith("/cleanup-events/")) return "Cleanup Event Details";
  return "Community Cleanliness & Care";
}

/** Brand splash shown for a moment on the first load, identical to the original app. */
function SplashCover({ isDark }: { isDark: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${isDark ? "bg-[#050a08]" : "bg-[#fafafa]"}`}
        >
          <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex flex-col items-center">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl"
            >
              <i className="ri-leaf-fill text-5xl tracking-tight text-emerald-400"></i>
            </motion.div>
            <h1 className={`text-4xl md:text-5xl font-heading font-black tracking-tight flex overflow-hidden ${isDark ? "text-white" : "text-slate-800"}`}>
              {["C", "i", "v", "i", "c"].map((l, i) => (
                <motion.span key={`c-${i}`} initial={{ y: 50 }} animate={{ y: 0 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 20 }}>
                  {l}
                </motion.span>
              ))}
              <span className="text-emerald-400 flex ml-1">
                {["N", "e", "s", "t"].map((l, i) => (
                  <motion.span key={`n-${i}`} initial={{ y: 50 }} animate={{ y: 0 }} transition={{ delay: (i + 5) * 0.05, type: "spring", stiffness: 300, damping: 20 }}>
                    {l}
                  </motion.span>
                ))}
              </span>
            </h1>
            <div className="mt-8 flex gap-3">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = (usePathname() || "/").toLowerCase();
  const { isDark } = useTheme();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    document.title = `${pageTitle(pathname)} | CivicNest`;
  }, [pathname]);

  return (
    <div className="min-h-screen w-full flex flex-col font-body antialiased selection:bg-teal-500/30 selection:text-teal-900 dark:selection:text-teal-100">
      <TopProgressBar />
      <SplashCover isDark={isDark} />
      {!isAuthPage && <Navbar />}
      {/* spacer for the fixed navbar */}
      {!isAuthPage && <div className="h-[4rem] shrink-0" aria-hidden="true" />}

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex-grow flex flex-col w-full"
      >
        <div className="flex-grow flex flex-col w-full">{children}</div>
        {!isAuthPage && <Footer />}
      </motion.main>

      {!isAuthPage && <ScrollProgressButton />}
      {!isAuthPage && <FloatingCivicBot />}
      {!isAuthPage && <HelpNotification />}
      <Toaster
        position="bottom-right"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          style: {
            zIndex: 99999,
            background: isDark ? "#111c21" : "#0f172a",
            color: isDark ? "#e2e8f0" : "#f1f5f9",
            border: `1px solid ${isDark ? "#1e3040" : "#1e293b"}`,
            borderRadius: "12px",
            fontSize: "14px",
          },
        }}
      />
    </div>
  );
}
