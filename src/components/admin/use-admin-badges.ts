"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { OrdersSummary } from "@/lib/orders";

/** Interval polling badge (ms) — hanya berjalan saat tab visible. */
const POLL_INTERVAL_MS = 60_000;

export type LeadSummary = {
  total: number;
  baru: number;
  diproses: number;
  selesai: number;
};

export type AdminBadges = {
  /** Jumlah lead berstatus "baru". */
  newLeads: number;
  /** Jumlah pesanan berstatus "baru". */
  newOrders: number;
  leadSummary: LeadSummary | null;
  orderSummary: OrdersSummary | null;
};

/**
 * Badge dinamis sidebar: lead baru + pesanan baru.
 *
 * - Polling ringan `?summary=1` (lead & order, paralel) setiap 60 detik,
 *   HANYA saat tab visible; refresh saat tab kembali visible/focus.
 * - Gagal fetch → diam (badge 0) — jangan ganggu admin dengan error.
 * - AbortController saat unmount/overlap agar tidak ada request nyangkut.
 * - setState hanya terjadi setelah `await` di dalam async — sesuai aturan
 *   React 19 `set-state-in-effect`.
 */
export function useAdminBadges(): AdminBadges & { refresh: () => Promise<void> } {
  const [leadSummary, setLeadSummary] = useState<LeadSummary | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrdersSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const [lead, order] = await Promise.all([
        adminFetch<{ summary: LeadSummary }>("/api/admin/leads?summary=1", {
          signal: controller.signal,
        }).catch(() => null),
        adminFetch<{ summary: OrdersSummary }>("/api/admin/orders?summary=1", {
          signal: controller.signal,
        }).catch(() => null),
      ]);
      if (controller.signal.aborted) return;
      if (lead) setLeadSummary(lead.summary);
      if (order) setOrderSummary(order.summary);
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
      const [lead, order] = await Promise.all([
        adminFetch<{ summary: LeadSummary }>("/api/admin/leads?summary=1").catch(
          () => null,
        ),
        adminFetch<{ summary: OrdersSummary }>(
          "/api/admin/orders?summary=1",
        ).catch(() => null),
      ]);
      if (!active) return;
      if (lead) setLeadSummary(lead.summary);
      if (order) setOrderSummary(order.summary);
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

  return {
    newLeads: leadSummary?.baru ?? 0,
    newOrders: orderSummary?.baru ?? 0,
    leadSummary,
    orderSummary,
    refresh,
  };
}
