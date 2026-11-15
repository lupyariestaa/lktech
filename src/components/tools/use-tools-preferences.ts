"use client";

import { useSyncExternalStore } from "react";
import {
  getFavoriteToolsSnapshot,
  getRecentToolsSnapshot,
  getServerToolsSnapshot,
  subscribeToolsPreferences,
} from "@/lib/tools-storage";

/**
 * Preferensi lokal LKTech Tools (favorit & recent) dibaca lewat
 * `useSyncExternalStore`.
 *
 * Snapshot server sengaja kosong dan stabil, lalu setelah hidrasi React
 * membaca nilai asli dari localStorage. Pola ini menghindari hydration
 * mismatch sekaligus mematuhi aturan React 19 `set-state-in-effect`.
 */
export function useToolFavorites(): string[] {
  return useSyncExternalStore(
    subscribeToolsPreferences,
    getFavoriteToolsSnapshot,
    getServerToolsSnapshot,
  );
}

/** Daftar tool yang terakhir dibuka (maks. 3, hanya slug). */
export function useRecentTools(): string[] {
  return useSyncExternalStore(
    subscribeToolsPreferences,
    getRecentToolsSnapshot,
    getServerToolsSnapshot,
  );
}
