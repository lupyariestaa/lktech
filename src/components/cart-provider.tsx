"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cartItemKey, type CartItem } from "@/lib/cart";
import { useAuth } from "@/components/auth-provider";

/**
 * Keranjang disimpan per-identitas agar TIDAK bocor antar user di perangkat
 * yang dipakai bersama. Key dasar + owner (uid user, atau "guest" bila anonim).
 */
const STORAGE_KEY_BASE = "lktech.cart.v1";
const GUEST_OWNER = "guest";

/** Owner aktif saat ini (uid user, atau "guest"). */
let cartOwner: string = GUEST_OWNER;

function keyFor(owner: string): string {
  return `${STORAGE_KEY_BASE}:${owner}`;
}

function readStorageFor(owner: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(owner));
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
  return readStorageFor(cartOwner);
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

  // Sinkronisasi antar-tab: saat tab lain mengubah localStorage milik owner
  // yang sama, muat ulang `cache` dari storage lalu umumkan ke pelanggan.
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === keyFor(cartOwner)) {
        cache = readStorage();
        hydrated = true;
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }

  return () => listeners.delete(cb);
}

function persist(owner: string, next: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(owner), JSON.stringify(next));
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

function setItems(next: CartItem[]) {
  cache = next;
  hydrated = true;
  persist(cartOwner, next);
  emit();
}

/**
 * Ganti owner keranjang (dipanggil saat user login/logout).
 *
 * Saat berpindah dari "guest" → user, item yang sudah ada di keranjang guest
 * DIGABUNG ke keranjang user (menjumlahkan kuantitas) agar tidak hilang setelah
 * login. Perpindahan lain (mis. antar user berbeda di perangkat yang sama)
 * murni memuat keranjang milik owner tujuan — tidak ada kebocoran antar user.
 */
export function setCartOwner(owner: string | null) {
  const next = owner ?? GUEST_OWNER;
  if (next === cartOwner) return;

  const previousOwner = cartOwner;
  const previousItems = hydrated ? cache : readStorageFor(previousOwner);
  cartOwner = next;

  let target = readStorageFor(next);

  const migratingGuest =
    previousOwner === GUEST_OWNER && next !== GUEST_OWNER;

  if (migratingGuest && previousItems.length > 0) {
    const bySlug = new Map(target.map((it) => [it.slug, { ...it }]));
    for (const it of previousItems) {
      const existing = bySlug.get(it.slug);
      if (existing) existing.qty += it.qty;
      else bySlug.set(it.slug, { ...it });
    }
    target = [...bySlug.values()];
    // Bersihkan keranjang guest setelah dipindahkan ke user.
    persist(GUEST_OWNER, []);
  }

  cache = target;
  hydrated = true;
  persist(next, target);
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
  /** `key` = `cartItemKey(item)` (slug + varian). */
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  has: (key: string) => boolean;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Ganti keranjang aktif sesuai identitas user. Menunggu auth selesai agar
  // tidak sempat memuat keranjang guest lalu menimpanya dengan milik user.
  // Saat user logout, owner kembali ke "guest" → keranjang user tidak terbaca.
  useEffect(() => {
    if (authLoading) return;
    setCartOwner(user?.uid ?? null);
  }, [user, authLoading]);

  const add = useCallback((item: CartItem) => {
    const prev = cache;
    const key = cartItemKey(item);
    const idx = prev.findIndex((it) => cartItemKey(it) === key);
    if (idx === -1) {
      setItems([...prev, item]);
      return;
    }
    const next = [...prev];
    next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
    setItems(next);
  }, []);

  const remove = useCallback((key: string) => {
    setItems(cache.filter((it) => cartItemKey(it) !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems(
      cache
        .map((it) => (cartItemKey(it) === key ? { ...it, qty: Math.max(1, qty) } : it))
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
    (key: string) => items.some((it) => cartItemKey(it) === key),
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
