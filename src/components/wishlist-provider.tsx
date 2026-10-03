"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getIdToken } from "@/lib/auth";
import { addWishlist, fetchWishlist, removeWishlist } from "@/lib/user-account-api";
import { useAuth } from "@/components/auth-provider";

type WishlistState = {
  /** Daftar slug favorit. */
  slugs: string[];
  /** Jumlah favorit. */
  count: number;
  /** Apakah produk sudah difavoritkan. */
  has: (slug: string) => boolean;
  /** Tambah/hapus favorit. Mengembalikan status baru (true = favorit). */
  toggle: (slug: string) => Promise<boolean>;
};

const WishlistContext = createContext<WishlistState | null>(null);

/**
 * Menyediakan state wishlist global (agar tombol favorit di kartu produk
 * konsisten tanpa memanggil API per-item). Memuat sekali saat login; kosong
 * saat belum login.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    let active = true;
    (async () => {
      try {
        if (!user) {
          if (active) setSlugs([]);
          return;
        }
        const { wishlist } = await fetchWishlist();
        if (active) setSlugs(wishlist);
      } catch {
        /* best-effort — biarkan kondisi saat ini */
      }
    })();
    return () => {
      active = false;
    };
  }, [user, loading]);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback(
    async (slug: string): Promise<boolean> => {
      const token = await getIdToken();
      if (!token) throw new Error("Masuk untuk menyimpan favorit.");
      const isFav = slugs.includes(slug);
      const prev = slugs;
      // Optimistic update.
      setSlugs(isFav ? prev.filter((s) => s !== slug) : [slug, ...prev]);
      try {
        const next = isFav
          ? await removeWishlist(slug)
          : await addWishlist(slug);
        setSlugs(next);
        return !isFav;
      } catch (err) {
        // Rollback bila gagal.
        setSlugs(prev);
        throw err;
      }
    },
    [slugs],
  );

  const value = useMemo<WishlistState>(
    () => ({ slugs, count: slugs.length, has, toggle }),
    [slugs, has, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistState {
  const ctx = useContext(WishlistContext);
  if (!ctx)
    throw new Error("useWishlist harus dipakai di dalam <WishlistProvider>.");
  return ctx;
}
