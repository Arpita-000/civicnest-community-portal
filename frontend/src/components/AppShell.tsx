"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollProgressButton from "./ScrollProgressButton";
import FloatingCivicBot from "./FloatingCivicBot";
import HelpNotification from "./HelpNotification";
import TopProgressBar from "./TopProgressBar";
import { MinimalLoader } from "./ui";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";

// Same access rules as the original app's PrivateRoute / MemberRoute / AdminRoute (main.jsx).
const MEMBER_PATHS = ["/lost-found/add-lost", "/lost-found/add-found", "/animals/add", "/volunteers/register", "/cleanup-events/organize"];
const PRIVATE_PREFIXES = [
  "/recent-activities", "/gallery", "/issues", "/contributions", "/lost-found", "/animals", "/membership",
  "/ai-assistant", "/profile", "/user", "/payment-success", "/payment-failure", "/noticeboard", "/volunteers",
  "/volunteer-dashboard", "/forum", "/map", "/leaderboard", "/fund", "/support", "/ngos", "/polls", "/cleanup-events",
];
const under = (path: string, p: string) => path === p || path.startsWith(p + "/");

function accessFor(path: string): "public" | "private" | "member" | "admin" {
  if (under(path, "/admin")) return "admin";
  if (MEMBER_PATHS.includes(path)) return "member";
  return PRIVATE_PREFIXES.some((p) => under(path, p)) ? "private" : "public";
}

function RouteGuard({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, dbUser, role, isMember, loading } = useAuth();
  const router = useRouter();
  const need = accessFor(path);
  // Role checks wait for the profile; a plain login check only waits for Firebase.
  const pending = need !== "public" && (loading || (need !== "private" && !!user && !dbUser));
  const allowed =
    need === "public" || (!!user && (need === "private" || (need === "member" && isMember) || (need === "admin" && role === "admin")));

  useEffect(() => {
    if (pending || allowed) return;
    if (need === "admin") router.replace("/");
    else if (!user) router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    else router.replace("/membership/request");
  }, [pending, allowed, need, user, router]);

  if (pending || !allowed)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <MinimalLoader />
      </div>
    );
  return <>{children}</>;
}

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
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center ${isDark ? "bg-[#050a08]" : "bg-[#fafafa]"}`}
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

  // Seeded records point at loremflickr.com, which often answers 500: swap any broken image (once)
  // for the generated /demo artwork. Pages with their own onError still run after this and win.
  useEffect(() => {
    const onError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img?.tagName !== "IMG" || img.dataset.fallback) return;
      img.dataset.fallback = "1";
      const kw = decodeURIComponent(img.src.split("?")[0].split("/").pop() || "").replace(/\.\w+$/, "").replace(/[^a-z0-9]+/gi, "-");
      img.src = `/demo/${/portrait|avatar|face|user|logo|man|woman/i.test(kw) ? "avatar" : "event"}-${kw || "community"}.svg`;
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

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
        <div className="flex-grow flex flex-col w-full">
          <RouteGuard path={pathname}>{children}</RouteGuard>
        </div>
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
