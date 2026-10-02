"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

/** Interval polling badge (ms) — hanya berjalan saat tab visible. */
const POLL_INTERVAL_MS = 60_000;

export type LeadSummary = {
  total: number;
  baru: number;
  diproses: number;
  selesai: number;
};

/**
 * Badge jumlah lead berstatus "baru" untuk sidebar.
 *
 * - Polling ringan `GET /api/admin/leads?summary=1` setiap 60 detik,
 *   HANYA saat tab visible; refresh saat tab kembali visible.
 * - Gagal fetch → diam (badge 0) — jangan ganggu admin dengan error.
 * - AbortController saat unmount/overlap agar tidak ada request nyangkut.
 * - setState hanya terjadi setelah `await` di dalam async — sesuai aturan
 *   React 19 `set-state-in-effect`.
 */
export function useLeadBadge(): {
  newCount: number;
  summary: LeadSummary | null;
  refresh: () => Promise<void>;
} {
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await adminFetch<{ summary: LeadSummary }>(
        "/api/admin/leads?summary=1",
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setSummary(data.summary);
    } catch {
      /* silent — badge opsional, jangan ganggu admin */
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Fetch awal — pola async IIFE (setState hanya setelah await).
    (async () => {
      try {
        const data = await adminFetch<{ summary: LeadSummary }>(
          "/api/admin/leads?summary=1",
        );
        if (active) setSummary(data.summary);
      } catch {
        /* silent — badge opsional, jangan ganggu admin */
      }
    })();
    start();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        stop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      abortRef.current?.abort();
    };
  }, [refresh]);

  return { newCount: summary?.baru ?? 0, summary, refresh };
}
