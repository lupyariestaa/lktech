"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/cart";

const STORAGE_KEY = "lktech.cart.v1";

/* -------------------------------------------------------------------------- */
/* External store: sumber kebenaran keranjang, disinkron ke localStorage.      */
/* -------------------------------------------------------------------------- */

let cache: CartItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is CartItem =>
        !!it &&
        typeof (it as CartItem).slug === "string" &&
        typeof (it as CartItem).price === "number" &&
        typeof (it as CartItem).qty === "number",
    );
  } catch {
    return [];
  }
}

function getSnapshot(): CartItem[] {
  if (!hydrated) {
    cache = readStorage();
    hydrated = true;
  }
  return cache;
}

/** Snapshot kosong & stabil untuk render server / saat hidrasi awal. */
const EMPTY: CartItem[] = [];

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setItems(next: CartItem[]) {
  cache = next;
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
  emit();
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** true setelah store ter-hidrasi dari localStorage. */
  ready: boolean;
  add: (item: CartItem) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  has: (slug: string) => boolean;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((item: CartItem) => {
    const prev = cache;
    const idx = prev.findIndex((it) => it.slug === item.slug);
    if (idx === -1) {
      setItems([...prev, item]);
      return;
    }
    const next = [...prev];
    next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
    setItems(next);
  }, []);

  const remove = useCallback((slug: string) => {
    setItems(cache.filter((it) => it.slug !== slug));
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setItems(
      cache
        .map((it) => (it.slug === slug ? { ...it, qty: Math.max(1, qty) } : it))
        .filter((it) => it.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(
    () => items.reduce((n, it) => n + it.qty, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items],
  );
  const has = useCallback(
    (slug: string) => items.some((it) => it.slug === slug),
    [items],
  );

  const value = useMemo<CartState>(
    () => ({
      items,
      count,
      subtotal,
      ready: items !== EMPTY,
      add,
      remove,
      setQty,
      clear,
      has,
    }),
    [items, count, subtotal, add, remove, setQty, clear, has],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>.");
  return ctx;
}
