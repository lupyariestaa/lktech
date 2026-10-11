"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar pembeli (FASE revisi dashboard pesanan): foto profil asli dari
 * `order.buyerPhotoUrl`, fallback ke inisial huruf pertama bila kosong/gagal
 * dimuat. Ukuran & bentuk dikonfigurasi lewat `className`.
 *
 * Memakai `<img>` (bukan `next/image`) agar mendukung host foto Google/user
 * apa pun tanpa perlu whitelist domain; `onError` beralih ke inisial.
 */
export function BuyerAvatar({
  name,
  email,
  photoUrl,
  size = 40,
  className,
}: {
  name?: string;
  email?: string;
  photoUrl?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name || email || "?").charAt(0).toUpperCase();

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name || email || "Pembeli"}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light font-bold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initial}
    </span>
  );
}