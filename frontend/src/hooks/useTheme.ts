"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "civicnest-theme";

/** Light/dark theme stored in localStorage and mirrored as the `dark` class on <html>. */
export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  // The inline script in layout.tsx already set the class before paint; just read it back.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const set = useCallback((dark: boolean) => {
    setIsDark(dark);
    document.documentElement.classList.add("theme-transition");
    document.documentElement.classList.toggle("dark", dark);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 450);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {}
  }, []);

  const toggle = useCallback(() => set(!document.documentElement.classList.contains("dark")), [set]);

  return { isDark, toggle };
}
