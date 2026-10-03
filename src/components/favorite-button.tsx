"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { useAccountStatus } from "@/components/account-status-provider";
import { cn } from "@/lib/utils";

/**
 * Tombol favorit (hati) untuk kartu/detail produk.
 *
 * - Belum login → arahkan ke `/masuk` dengan `next` kembali ke halaman ini.
 * - Sudah login → toggle wishlist (optimistic, tersimpan server).
 */
export function FavoriteButton({
  slug,
  className,
  size = "md",
}: {
  slug: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { blocked } = useAccountStatus();
  const { has, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);

  const active = has(slug);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || blocked) return;
    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(pathname || "/produk")}`);
      return;
    }
    setBusy(true);
    try {
      await toggle(slug);
    } catch {
      /* gagal → state dikembalikan oleh provider; abaikan */
    } finally {
      setBusy(false);
    }
  };

  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Hapus dari favorit" : "Tambah ke favorit"}
      aria-pressed={active}
      disabled={busy}
      className={cn(
        "grid place-items-center rounded-full border backdrop-blur transition-colors disabled:opacity-60",
        dim,
        active
          ? "border-rose-200 bg-rose-50 text-rose-500"
          : "border-slate-200 bg-white/80 text-slate-400 hover:border-rose-200 hover:text-rose-500",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", active && "fill-current")} />
      )}
    </button>
  );
}
