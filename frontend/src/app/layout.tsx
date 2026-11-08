import "./globals.css";
import React from "react";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import SmoothScroll from "../components/SmoothScroll";

export const metadata: Metadata = {
  title: "CivicNest",
  description: "CivicNest — report civic issues, find lost items, rescue animals, and organize cleanup drives in your community.",
  icons: { icon: "/favicon.png" },
  openGraph: { title: "CivicNest", description: "Report civic issues, find lost items, and volunteer in your community.", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

// Runs before first paint so there is no light/dark flash on reload. Light by default, like the original.
const THEME_BOOT = `(function(){try{if(localStorage.getItem('civicnest-theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Raleway:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>{`html,body{margin:0;padding:0;background-color:#fafafa}html.dark,html.dark body{background-color:#050a08}`}</style>
      </head>
      <body>
        <AuthProvider>
          <SmoothScroll>
            <AppShell>{children}</AppShell>
          </SmoothScroll>
        </AuthProvider>
      </body>
    </html>
  );
}
