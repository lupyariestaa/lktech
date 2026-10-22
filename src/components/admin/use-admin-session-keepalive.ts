"use client";

import { useEffect } from "react";
import { getIdToken, signOutUser } from "@/lib/auth";
import { clearAdminSession } from "@/lib/admin-fetch";
import {
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_SESSION_REFRESH_MS,
  ADMIN_SESSION_TICK_MS,
} from "@/lib/session-constants";

/**
 * Menjaga sesi admin tetap hidup HANYA saat ada aktivitas pengguna.
 *
 * - Cookie sesi berumur 60 menit; hook me-refresh lewat `/api/admin/session`
 *   tiap 5 menit bila pengguna aktif (pointer/keyboard/scroll).
 * - Tanpa aktivitas 60 menit → logout paksa (cookie juga kedaluwarsa).
 * - Refresh yang ditolak (401/403) → logout + redirect.
 * - Absolute 12 jam tetap ditegakkan server (cookie login + `auth_time`),
 *   jadi refresh tidak bisa memperpanjang tanpa batas.
 */
export function useAdminSessionKeepalive(
  enabled: boolean,
  onExpired: () => void,
) {
  useEffect(() => {
    if (!enabled) return;

    let lastActivity = Date.now();
    let lastRefresh = Date.now();
    let stopped = false;
    let refreshing = false;

    const expire = async () => {
      if (stopped) return;
      stopped = true;
      await clearAdminSession({ revoke: true });
      await signOutUser();
      onExpired();
    };

    const refresh = async () => {
      if (stopped || refreshing) return;
      refreshing = true;
      try {
        const token = await getIdToken();
        if (!token) {
          await expire();
          return;
        }
        const res = await fetch("/api/admin/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.status === 401 || res.status === 403) {
          await expire();
          return;
        }
        if (res.ok) lastRefresh = Date.now();
      } catch {
        /* Gangguan jaringan sesaat: biarkan tick berikutnya mencoba lagi. */
      } finally {
        refreshing = false;
      }
    };

    const markActivity = () => {
      if (stopped) return;
      const now = Date.now();
      if (now - lastActivity >= ADMIN_IDLE_TIMEOUT_MS) {
        void expire();
        return;
      }
      lastActivity = now;
      if (now - lastRefresh >= ADMIN_SESSION_REFRESH_MS) {
        void refresh();
      }
    };

    const onVisibility = () => {
      if (stopped || document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity >= ADMIN_IDLE_TIMEOUT_MS) {
        void expire();
        return;
      }
      if (Date.now() - lastRefresh >= ADMIN_SESSION_REFRESH_MS) {
        void refresh();
      }
    };

    const tick = () => {
      if (stopped) return;
      const now = Date.now();
      if (now - lastActivity >= ADMIN_IDLE_TIMEOUT_MS) {
        void expire();
        return;
      }
      if (now - lastRefresh >= ADMIN_SESSION_REFRESH_MS) {
        void refresh();
      }
    };

    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;
    for (const event of events) {
      window.addEventListener(event, markActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(tick, ADMIN_SESSION_TICK_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      for (const event of events) {
        window.removeEventListener(event, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, onExpired]);
}
