"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const linkCls =
  "inline-block text-sm font-semibold text-slate-800 dark:text-white hover:translate-x-1.5 hover:text-[#134e4a] transition-all duration-300 drop-shadow-sm cursor-pointer text-left";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "About",
    links: [
      { label: "Goals & vision", href: "/goals-and-vision" },
      { label: "Our story", href: "/goals-and-vision" },
      { label: "Press kit", href: "/press-kit" },
      { label: "Careers", href: "/volunteers/register" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Community guidelines", href: "/community-guidelines" },
      { label: "Posting standards", href: "/community-guidelines" },
      { label: "Safety", href: "/community-guidelines" },
      { label: "User Manual", href: "/user-manual" },
      { label: "FAQ", href: "/user-manual" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Find a Nest", href: "/map" },
      { label: "Events", href: "/cleanup-events" },
      { label: "Top Contributors", href: "/leaderboard" },
      { label: "Badges", href: "/leaderboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/community-guidelines" },
      { label: "Terms", href: "/community-guidelines" },
      { label: "Cookies", href: "/status" },
    ],
  },
];

const SOCIAL = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    hover: "hover:text-pink-600",
    path: "M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    hover: "hover:text-[#0a66c2]",
    path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z",
  },
  {
    label: "X",
    href: "https://x.com",
    hover: "hover:text-black",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
];

const BOTTOM = [
  { label: "Status", href: "/status" },
  { label: "Press Kit", href: "/press-kit" },
  { label: "Guidelines", href: "/community-guidelines" },
  { label: "Manual", href: "/user-manual" },
  { label: "Goals", href: "/goals-and-vision" },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <footer className="w-full mt-auto font-body tracking-tight relative z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#e9ecef] via-[#bde0fe] to-[#028090] opacity-90 -z-10"></div>

      <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 pt-24 pb-20 flex flex-col md:flex-row justify-between items-start gap-16 md:gap-12 lg:gap-20">
        {/* Brand & mission */}
        <div className="w-full md:w-[35%] lg:w-[30%] flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-slate-100 dark:bg-[#1e3040] border-2 border-slate-200 dark:border-[#1e3040] shadow-sm overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="CivicNest" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="block text-[24px] text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-sm" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
                Civic<span className="text-[#0f766e]">Nest</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-[#0f766e] leading-none mt-1">Sustainable Urban Living</span>
            </div>
          </div>

          <p className="text-slate-800 dark:text-white text-sm leading-relaxed max-w-sm mt-1 drop-shadow-sm">
            Fostering communal pride and ecological stewardship through a digital sanctuary for our cities.
          </p>

          <div className="flex gap-4 mt-2">
            {SOCIAL.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className={`w-10 h-10 rounded-full bg-white/40 dark:bg-[#0a120e] ring-1 ring-slate-100 dark:ring-[#14241d]/40 backdrop-blur-md shadow-sm border border-white/50 flex items-center justify-center text-slate-900 dark:text-white ${s.hover} hover:scale-105 transition-all duration-300 cursor-pointer`}
              >
                <svg aria-hidden="true" className="w-[1.125rem] h-[1.125rem]" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d={s.path}></path>
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="w-full md:w-[65%] lg:w-[70%] grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-12">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <h4 className="font-label text-sm font-bold tracking-[0.15em] text-slate-900 dark:text-white uppercase mb-1 drop-shadow-sm">{col.title}</h4>
              {col.links.map((l) => (
                <Link key={l.label} className={linkCls} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full border-t border-white/20 bg-black/5 py-8 px-8 sm:px-12 md:px-16 text-sm font-medium text-slate-900 dark:text-white drop-shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row justify-between items-center gap-6">
          <p>© 2026 CivicNest. All rights reserved. Cultivating urban sanctuaries with purpose.</p>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 w-full lg:w-auto justify-between lg:justify-end">
            <button
              className="flex items-center gap-2 font-label font-bold tracking-[0.15em] uppercase hover:text-[#134e4a] transition-all duration-300 group cursor-pointer"
              onClick={() => {
                const lenis = (window as unknown as { lenis?: { scrollTo: (target: number, opts?: { duration?: number }) => void } }).lenis;
                if (lenis) {
                  lenis.scrollTo(0, { duration: 1.0 });
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              Back to top
              <span className="material-symbols-outlined group-hover:-translate-y-1 transition-transform duration-300">arrow_upward</span>
            </button>
            <div className="flex gap-4 font-label font-bold tracking-[0.15em] uppercase text-[11px] sm:text-[12px]">
              {BOTTOM.map((item) => (
                <Link key={item.label} href={item.href} className="hover:text-[#134e4a] transition-all duration-300 uppercase tracking-[0.15em] font-bold cursor-pointer">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
