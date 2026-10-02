"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lktech:admin-sidebar";
const CHANGE_EVENT = "lktech:admin-sidebar-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  // Sinkron antar-tab (storage event hanya menyala di tab lain).
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  // Server & hidrasi awal selalu expanded → tidak ada hydration mismatch.
  return false;
}

/**
 * State collapse sidebar desktop (rail icon-only ↔ expanded) dengan
 * persistensi per-browser via localStorage.
 *
 * Menggunakan `useSyncExternalStore` — cara React yang benar untuk store
 * eksternal (localStorage): snapshot server stabil (expanded) sehingga bebas
 * hydration mismatch, lalu re-render dengan nilai client setelah mount.
 * Hanya berlaku ≥ lg; drawer mobile memakai state `open` terpisah.
 */
export function useSidebarState(): {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
} {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setCollapsed = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "collapsed" : "expanded");
    } catch {
      /* localStorage bisa diblokir (private mode) — abaikan. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(getSnapshot() === false);
  }, [setCollapsed]);

  return { collapsed, toggle, setCollapsed };
}
