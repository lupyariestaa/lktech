"use client";

import { useEffect } from "react";
import { trackScrollDepth } from "@/lib/analytics";

/**
 * Pelacak kedalaman scroll beranda (FASE H7).
 *
 * Mengirim `scroll_depth` sekali untuk tiap milestone (25/50/75/100%). Ringan
 * (listener pasif + `requestAnimationFrame`) dan aman bila analytics nonaktif
 * (pembungkus `trackScrollDepth` no-op). Tanpa PII.
 *
 * Di-mount di beranda saja; halaman lain tak perlu.
 */
export function ScrollDepthTracker() {
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    const fired = new Set<number>();
    let ticking = false;

    const compute = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;
      const percent = Math.min(
        100,
        Math.round((doc.scrollTop / scrollable) * 100),
      );
      for (const m of milestones) {
        if (percent >= m && !fired.has(m)) {
          fired.add(m);
          trackScrollDepth(m);
        }
      }
      if (fired.size === milestones.length) {
        window.removeEventListener("scroll", onScroll);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
