"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { INTRO_DURATION, useReducedMotionPreference } from "@/lib/intro";

/**
 * Intro / loading animation singkat saat pertama kali halaman dibuka.
 */
export function IntroLoader() {
  const [done, setDone] = useState(false);
  const reduced = useReducedMotionPreference();

  useEffect(() => {
    const delay = reduced ? 200 : INTRO_DURATION;
    const t = setTimeout(() => setDone(true), delay);
    document.body.style.overflow = "hidden";
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => {
    if (done) document.body.style.overflow = "";
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-white"
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid-lines absolute inset-0 opacity-60" />
          <div className="absolute h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />

          <div className="relative flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid h-20 w-20 place-items-center"
            >
              <motion.span
                className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-xl font-bold text-white shadow-lg shadow-primary/40">
                LK
              </span>
            </motion.div>

            <div className="h-[3px] w-40 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-medium tracking-widest text-muted uppercase"
            >
              LKTech
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
