"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import ThemeToggle from "./ThemeToggle";
import GlobalSearchModal from "./GlobalSearchModal";

const SCROLL_THRESHOLD = 15;
const EASE = [0.23, 1, 0.32, 1] as const;

const DRAWER_ITEMS = [
  { name: "Map", icon: "map", path: "/map" },
  { name: "Animals", icon: "pets", path: "/animals" },
  { name: "Lost & Found", icon: "find_in_page", path: "/lost-found" },
  { name: "Threads", icon: "forum", path: "/forum" },
  { name: "NGOs", icon: "diversity_3", path: "/ngos" },
  { name: "Leaderboard", icon: "leaderboard", path: "/leaderboard" },
  { name: "Gallery", icon: "photo_library", path: "/gallery" },
  { name: "User Manual", icon: "help", path: "/user-manual" },
];

/** Deterministic pseudo-random activity grid (LeetCode style), seeded by the user's email. */
function contributionGrid(lastActive: string | null | undefined, streak: number, email?: string | null) {
  const today = new Date();
  let seed = email ? Array.from(email).reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0) : 0;
  const rand = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  const isActive = (d: Date) => {
    if (!lastActive || !streak) return false;
    const a = new Date(d);
    a.setHours(0, 0, 0, 0);
    const b = new Date(lastActive);
    b.setHours(0, 0, 0, 0);
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    return diff >= 0 && diff < streak;
  };
  const days: { date: Date; level: number }[] = [];
  for (let i = 167; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    let level = 0;
    if (isActive(date)) level = Math.floor(rand() * 3) + 2;
    else {
      const r = rand();
      if (r > 0.995) level = 4;
      else if (r > 0.98) level = 3;
      else if (r > 0.96) level = 2;
      else if (r > 0.9) level = 1;
    }
    days.push({ date, level });
  }
  return Array.from({ length: 24 }, (_, i) => days.slice(i * 7, (i + 1) * 7));
}

const FireIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className} aria-label="Fire" role="img" style={{ overflow: "visible" }}>
    <g className="fire-core-group">
      <path fill="#D94030" d="M50,95 C30,90 10,75 8,55 C6,38 18,25 22,18 C18,30 24,38 28,32 C24,22 30,10 38,5 C34,16 40,24 46,20 C44,12 50,2 50,2 C50,2 56,12 54,20 C60,24 66,16 62,5 C70,10 76,22 72,32 C76,38 82,30 78,18 C82,25 94,38 92,55 C90,75 70,90 50,95Z" />
      <path fill="#F05A28" d="M50,93 C35,88 20,76 18,60 C16,46 26,35 30,27 C28,36 34,43 38,37 C35,28 40,16 47,11 C44,20 48,28 50,23 C52,28 56,20 53,11 C60,16 65,28 62,37 C66,43 72,36 70,27 C74,35 84,46 82,60 C80,76 65,88 50,93Z" />
      <path fill="#F5891A" d="M50,90 C40,85 30,78 28,67 C26,57 33,48 37,42 C36,50 40,55 44,51 C42,43 45,34 50,30 C55,34 58,43 56,51 C60,55 64,50 63,42 C67,48 74,57 72,67 C70,78 60,85 50,90Z" />
      <path fill="#FBBB10" d="M50,87 C44,84 38,79 37,72 C36,65 41,59 44,55 C43,61 46,65 49,62 C48,56 50,50 50,47 C50,50 52,56 51,62 C54,65 57,61 56,55 C59,59 64,65 63,72 C62,79 56,84 50,87Z" />
      <path fill="#FDE97A" d="M50,85 C46,83 43,80 42,76 C41,71 44,67 50,65 C56,67 59,71 58,76 C57,80 54,83 50,85Z" />
    </g>
  </svg>
);

export default function Navbar() {
  const { user, dbUser, role, loading, signOutUser } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activePolls, setActivePolls] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Show the cached avatar while Firebase is still restoring the session.
  const signedIn = !!user || (loading && !!dbUser);
  const displayName = dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "Neighbour";
  const photo = dbUser?.photoURL || user?.photoURL;
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const streak = dbUser?.streak;

  useEffect(() => {
    let alive = true;
    api.get("/polls/stats").then((r: any) => alive && setActivePolls(r?.active ?? r?.data?.active ?? 0)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const mainNavItems = useMemo(
    () => [
      { name: "Home", path: "/" },
      { name: "Issues", path: "/issues" },
      { name: "Notices", path: "/noticeboard" },
      { name: "Volunteers", path: "/volunteers" },
      { name: "Polls", path: "/polls", badge: activePolls },
      ...(role === "admin" || role === "moderator" ? [{ name: "Admin", path: "/admin" }] : []),
    ],
    [activePolls, role]
  );

  const activeIndex = mainNavItems.findIndex((i) => i.path === pathname || (i.path !== "/" && pathname.startsWith(i.path)));

  const handleLogOut = useCallback(async () => {
    setMenuOpen(false);
    await signOutUser();
    router.push("/login");
  }, [signOutUser, router]);

  const grid = useMemo(
    () => (signedIn && streak ? contributionGrid(streak.lastActiveDate, streak.current, user?.email || dbUser?.email) : null),
    [signedIn, streak, user?.email, dbUser?.email]
  );
  const cells = grid ? grid.flat() : [];
  const activeDays = cells.filter((c) => c.level > 0).length;
  const submissions = cells.reduce((acc, c) => acc + (c.level > 0 ? Math.floor(c.level * 1.5 + 1) : 0), 0);

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <motion.div
          initial={false}
          animate={{
            width: scrolled ? "95%" : "100%",
            maxWidth: scrolled ? "64rem" : "100%",
            borderRadius: scrolled ? "9999px" : "0px",
            marginTop: scrolled ? "0.75rem" : 0,
            paddingTop: scrolled ? "0.5rem" : "0.75rem",
            paddingBottom: scrolled ? "0.5rem" : "0.75rem",
            paddingLeft: scrolled ? "1.5rem" : "2rem",
            paddingRight: scrolled ? "1.5rem" : "2rem",
            boxShadow: scrolled ? "0 0.75rem 2.5rem -0.625rem rgba(0,0,0,0.08)" : "0 1px 0 rgba(226, 232, 240, 0.6)",
            borderWidth: scrolled ? "1px" : "0 0 1px 0",
            borderColor: "rgba(226, 232, 240, 0.6)",
          }}
          transition={{ duration: 0.45, ease: EASE }}
          className="pointer-events-auto flex items-center justify-between max-w-full overflow-visible bg-white/85 dark:bg-[#0b1215]/85 backdrop-blur-xl border-solid border-slate-200 dark:border-[#1e3040]/60"
        >
          {/* Left: drawer toggle + logo */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="p-2 -ml-2 text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#1e3040] rounded-full transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[26px]">menu</span>
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div
                initial={false}
                animate={{ width: scrolled ? "2.25rem" : "2.5rem", height: scrolled ? "2.25rem" : "2.5rem" }}
                transition={{ duration: 0.45, ease: EASE }}
                className="hidden sm:flex rounded-[12px] bg-slate-100 dark:bg-[#1e3040] border-2 border-slate-200 dark:border-[#1e3040] shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105"
              >
                <img src="/logo.png" alt="CivicNest" className="w-full h-full object-cover" />
              </motion.div>
              <div>
                <motion.span
                  initial={false}
                  animate={{ fontSize: scrolled ? "1.125rem" : "1.375rem" }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="block text-slate-900 dark:text-white tracking-tight leading-none"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}
                >
                  Civic<span className="text-[#0f766e]">Nest</span>
                </motion.span>
                <motion.span
                  initial={false}
                  animate={{ opacity: scrolled ? 0 : 1, maxHeight: scrolled ? 0 : 12, marginTop: scrolled ? 0 : 1 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="hidden sm:block overflow-hidden text-[7px] font-bold uppercase tracking-widest text-[#0f766e]"
                >
                  Sustainable Urban Living
                </motion.span>
              </div>
            </Link>
          </div>

          {/* Centre: rolling-text nav links */}
          <nav className="hidden lg:flex items-center gap-1 md:gap-2 relative">
            {mainNavItems.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className="relative inline-flex items-center px-3 py-2 text-[14.5px] font-bold group z-10"
                >
                  <span className="relative flex flex-col overflow-hidden h-[22px] justify-start items-center">
                    <span className={`flex items-center justify-center h-[22px] transition-all duration-300 ease-out ${isActive ? "text-[#0f766e]" : "text-slate-700 dark:text-[#cbd5e1] group-hover:-translate-y-full"}`}>
                      {item.name}
                    </span>
                    {!isActive && (
                      <span className="absolute top-full left-0 flex items-center justify-center h-[22px] w-full text-[#0f766e] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-full">
                        {item.name}
                      </span>
                    )}
                  </span>
                  {"badge" in item && (item as any).badge > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center bg-emerald-600 text-white text-[9px] font-bold rounded-full border border-white shadow-sm select-none">
                      {(item as any).badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div layoutId="activeTabBackground" className="absolute inset-0 bg-[#0f766e]/10 rounded-full z-0" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: search, help, profile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1e3040] dark:text-[#cbd5e1] rounded-full transition-colors flex items-center justify-center focus:outline-none cursor-pointer"
            >
              <i className="ri-search-line text-[20px]"></i>
            </button>
            <Link
              href="/user-manual"
              title="Help & User Manual"
              className="hidden sm:flex p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1e3040] dark:text-[#cbd5e1] rounded-full transition-colors flex items-center justify-center focus:outline-none shrink-0 cursor-pointer"
            >
              <i className="ri-question-line text-[20px]"></i>
            </Link>

            {signedIn ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-full border border-slate-200 dark:border-[#1e3040] hover:bg-slate-50 dark:hover:bg-[#0b1215] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center text-xs font-bold shrink-0 relative">
                    <span className="absolute inset-0 flex items-center justify-center">{initials}</span>
                    {photo && <img src={photo} alt={displayName} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-slate-500 dark:text-slate-300 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-12 w-56 bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] rounded-lg shadow-xl border border-slate-100 dark:border-[#14241d] overflow-hidden origin-top-right z-50"
                    >
                      <div className="px-4 py-3 bg-slate-50 dark:bg-[#0b1215]/50">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{user?.email || dbUser?.email}</p>
                        {!!streak?.current && streak.current > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 py-1 px-3 bg-orange-500/10 rounded-full select-none w-fit">
                            <FireIcon size={18} className="shrink-0" />
                            <span className="text-[11px] font-extrabold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                              Streak: {streak.current} {streak.current === 1 ? "day" : "days"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="h-px bg-slate-100 dark:bg-[#1e3040]" />
                      <div className="py-2">
                        <Link href="/profile" onClick={() => setMenuOpen(false)} className="block w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#0b1215] transition-colors">
                          Dashboard
                        </Link>
                        <Link href="/issues/my" onClick={() => setMenuOpen(false)} className="block w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#0b1215] transition-colors">
                          My Reports
                        </Link>
                        <Link
                          href="/user-manual"
                          onClick={() => setMenuOpen(false)}
                          className="block w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#0b1215] transition-colors cursor-pointer"
                        >
                          User Manual
                        </Link>
                      </div>
                      <div className="h-px bg-slate-100 dark:bg-[#1e3040]" />
                      <div className="py-2">
                        <button onClick={handleLogOut} className="w-full px-4 py-2 text-[13px] text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2 cursor-pointer">
                          <span className="material-symbols-outlined text-[18px] text-red-600 leading-none">logout</span>
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="px-5 py-2 text-[13px] font-semibold text-white bg-[#0f766e] rounded-full hover:bg-[#0d645d] transition-all shadow-sm">
                Log in
              </Link>
            )}
          </div>
        </motion.div>
      </header>

      {/* Side drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]" />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d] z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-teal-500/15 flex items-center justify-between bg-teal-50/50 dark:bg-[#0d1d18]/60 shrink-0">
                <span className="text-[17px] font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                  <span className="animated-compass material-symbols-outlined text-[#0f766e] dark:text-[#2dd4bf] text-[24px]">explore</span>
                  Explore
                </span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="p-1.5 text-slate-500 hover:bg-teal-600/10 hover:text-[#0f766e] dark:hover:bg-teal-500/15 dark:hover:text-[#2dd4bf] rounded-full transition-colors flex items-center justify-center cursor-pointer">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-1.5">
                <div className="lg:hidden flex flex-col gap-1.5 mb-2 pb-2 border-b border-slate-100 dark:border-[#1e3040] shrink-0">
                  {mainNavItems.map((item) => {
                    const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.name}
                        href={item.path}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${
                          isActive ? "bg-[#0f766e]/10 text-[#0f766e] dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]" : "text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2 mb-1 shrink-0">Discover</span>
                {DRAWER_ITEMS.map((item) => (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-700 dark:text-[#cbd5e1] hover:bg-[#0f766e]/10 dark:hover:bg-[#2dd4bf]/10 hover:text-[#0f766e] dark:hover:text-[#2dd4bf] transition-colors font-bold text-[13px] shrink-0 text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] opacity-70">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}

                <Link
                  href="/ai-assistant"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-700 dark:text-[#cbd5e1] hover:bg-[#0f766e]/10 dark:hover:bg-[#2dd4bf]/10 hover:text-[#0f766e] dark:hover:text-[#2dd4bf] transition-all font-bold text-[13px] group relative overflow-hidden cursor-pointer mt-1 text-left w-full shrink-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-[20px] opacity-70 group-hover:opacity-100 transition-opacity shrink-0">smart_toy</span>
                    <span className="truncate whitespace-nowrap">CivicBot AI</span>
                  </div>
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded shadow-sm border border-indigo-400/20 shrink-0 flex items-center gap-0.5">
                    AI <i className="ri-sparkling-fill text-[9px] animate-pulse" />
                  </span>
                </Link>

                {signedIn && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-[#1e3040] my-4 shrink-0" />
                    <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block shrink-0">Your Space</span>
                    <Link href="/issues/my" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-700 dark:text-[#cbd5e1] hover:bg-[#0f766e]/10 hover:text-[#0f766e] transition-colors font-bold text-[13px] text-left shrink-0">
                      <span className="material-symbols-outlined text-[20px] opacity-70">description</span>
                      My Reports
                    </Link>
                    <Link href="/lost-found/my" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-700 dark:text-[#cbd5e1] hover:bg-[#0f766e]/10 hover:text-[#0f766e] transition-colors font-bold text-[13px] text-left shrink-0 cursor-pointer">
                      <span className="material-symbols-outlined text-[20px] opacity-70">find_in_page</span>
                      My Lost &amp; Found
                    </Link>
                    <Link href="/profile" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0f766e] bg-[#0f766e]/10 hover:bg-[#0f766e]/20 transition-all font-bold border border-[#0f766e]/20 shadow-sm text-[13px] group backdrop-blur-md mt-1 shrink-0">
                      <span className="material-symbols-outlined group-hover:scale-110 transition-transform">dashboard</span>
                      Dashboard
                    </Link>
                  </>
                )}

                <Link
                  href="/support"
                  onClick={() => setDrawerOpen(false)}
                  className="relative flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600/10 to-emerald-600/10 hover:from-teal-600/20 hover:to-emerald-600/20 border border-teal-500/20 dark:border-teal-400/20 transition-all font-bold text-[13px] my-4 shrink-0 shadow-sm overflow-hidden group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="material-symbols-outlined text-[20px] text-teal-600 dark:text-teal-400 animate-pulse">volunteer_activism</span>
                    <span className="text-slate-700 dark:text-[#cbd5e1] group-hover:text-[#0f766e] dark:group-hover:text-teal-300 transition-colors font-bold">Support CivicNest</span>
                  </div>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-extrabold uppercase bg-teal-500/10 border border-teal-500/20 rounded px-2 py-0.5 tracking-wider relative z-10 shrink-0">Donate</span>
                </Link>

                <div className="h-px bg-slate-100 dark:bg-[#1e3040] my-4 shrink-0" />
                <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0">Preferences</span>

                {signedIn && streak && grid && (
                  <div className="flex flex-col gap-3.5 px-4 py-4 rounded-2xl bg-white dark:bg-[#0a120e] mb-2 select-none shrink-0 border border-slate-100 dark:border-slate-800/40 shadow-sm">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-extrabold text-slate-800 dark:text-slate-200">Contribution Calendar</span>
                        <div className="flex items-center gap-1">
                          <FireIcon size={18} className="shrink-0" />
                          <span className="text-[11px] font-bold text-orange-500">{streak.current} day streak</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{submissions} submissions in the past 24 weeks</span>
                    </div>
                    <div className="flex justify-center py-1">
                      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]">
                        {grid.map((col, cIdx) => (
                          <div key={cIdx} className="flex flex-col gap-[3px]">
                            {col.map((cell, rIdx) => (
                              <div
                                key={rIdx}
                                title={`${cell.date.toLocaleDateString()}: ${cell.level === 0 ? "No" : cell.level * 2} contributions`}
                                className={`w-2 h-2 rounded-[1.5px] transition-all hover:scale-125 ${
                                  cell.level === 0
                                    ? "bg-slate-100 dark:bg-slate-800/60"
                                    : cell.level === 1
                                    ? "bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300/20"
                                    : cell.level === 2
                                    ? "bg-emerald-300 dark:bg-emerald-800/60"
                                    : cell.level === 3
                                    ? "bg-emerald-500 dark:bg-emerald-600"
                                    : "bg-emerald-600 dark:bg-emerald-400"
                                }`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                      <span>Active Days: <strong className="text-slate-600 dark:text-slate-300">{activeDays}</strong></span>
                      <span>Max Streak: <strong className="text-slate-600 dark:text-slate-300">{Math.max(streak.best || 0, streak.current || 0)}</strong></span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-700 dark:text-[#cbd5e1] bg-slate-50 dark:bg-[#0b1215] transition-colors font-bold text-[13px] shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] opacity-70">dark_mode</span>
                    Dark Mode
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
