"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lktech.admin.orders.view";
const CHANGE_EVENT = "lktech:admin-orders-view-change";

export type OrdersView = "table" | "card";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): OrdersView {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "table" || v === "card") return v;
  } catch {
    /* localStorage bisa diblokir — abaikan. */
  }
  // Default responsif bila belum pernah diset.
  try {
    return window.matchMedia("(max-width: 768px)").matches ? "card" : "table";
  } catch {
    return "table";
  }
}

function getServerSnapshot(): OrdersView {
  return "table";
}

/**
 * Preferensi tampilan daftar pesanan (tabel ⇄ kartu) dengan persistensi
 * per-browser. `useSyncExternalStore` agar snapshot server stabil (bebas
 * hydration mismatch) lalu re-render dengan nilai client setelah mount.
 */
export function useOrdersView(): { view: OrdersView; setView: (v: OrdersView) => void } {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = useCallback((v: OrdersView) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* abaikan */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { view, setView };
}