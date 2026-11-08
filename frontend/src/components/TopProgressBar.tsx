"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function TopProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate a quick flash across the top on page change
    setProgress(30);
    const t1 = setTimeout(() => setProgress(75), 100);
    const t2 = setTimeout(() => setProgress(100), 250);
    const t3 = setTimeout(() => setProgress(0), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {progress > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 w-full h-1 z-[9999] pointer-events-none"
        >
          <motion.div
            className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.7)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut", duration: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

