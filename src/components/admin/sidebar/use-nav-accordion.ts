"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * State buka/tutup accordion submenu sidebar.
 *
 * - Disimpan di `localStorage` (`lktech.admin.nav.open`) sebagai daftar id item
 *   yang TERBUKA (bukan tertutup) agar default rapi.
 * - **Auto-buka** bila ada anak yang aktif (pathname) — dipaksa terbuka secara
 *   turunan (derived), tanpa menulis storage (menghindari efek tak sengaja).
 * - Sinkron antar-tab via event `storage`.
 */

const STORAGE_KEY = "lktech.admin.nav.open";
const listeners = new Set<() => void>();
let cache: Set<string> | null = null;

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function getSnapshot(): Set<string> {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): Set<string> {
  return new Set();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = read();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: Set<string>) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* storage bisa diblokir — abaikan */
  }
  listeners.forEach((l) => l());
}

export function useNavAccordion() {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Bersihkan cache saat pertama mount (hindari snapshot basi antar-route).
  useEffect(() => {
    cache = read();
  }, []);

  const toggle = useCallback((id: string) => {
    const current = getSnapshot();
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write(next);
  }, []);

  const openItem = useCallback((id: string) => {
    const current = getSnapshot();
    if (current.has(id)) return;
    const next = new Set(current);
    next.add(id);
    write(next);
  }, []);

  return { open, toggle, openItem };
}
