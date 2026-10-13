"use client";

import { useEffect } from "react";

/**
 * Registrasi service worker PWA (Tema 3.5, B2).
 *
 * Aman: no-op saat SSR/tanpa dukungan, dan hanya di produksi (di dev, SW
 * mengganggu hot-reload). Tidak melempar error bila registrasi gagal.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* fail-safe: SW opsional, jangan ganggu pengalaman */
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}