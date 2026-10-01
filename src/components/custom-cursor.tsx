"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const CURSOR_QUERY = "(pointer: fine) and (prefers-reduced-motion: no-preference)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(CURSOR_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(CURSOR_QUERY).matches;
}

/**
 * Custom cursor: titik kecil yang mengikuti kursor + cincin tertinggal.
 * Hanya aktif di perangkat pointer presisi (desktop) tanpa reduced-motion.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    if (!enabled) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let scale = 1;
    let targetScale = 1;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest(
        "a, button, [data-cursor-hover], input, textarea",
      );
      targetScale = interactive ? 2.1 : 1;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);

    let raf = 0;
    const loop = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      scale += (targetScale - scale) * 0.14;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="custom-cursor pointer-events-none fixed inset-0 z-[9999] hidden md:block"
    >
      <div
        ref={dotRef}
        className="absolute h-1.5 w-1.5 rounded-full bg-primary"
        style={{ willChange: "transform" }}
      />
      <div
        ref={ringRef}
        className="absolute h-8 w-8 rounded-full border border-primary/50 mix-blend-difference"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
