"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { trackCtaClick } from "@/lib/analytics";

/**
 * `next/link` yang mencatat event analitik saat diklik (FASE H7).
 *
 * Dipakai untuk CTA navigasi bernilai konversi (mis. "Lihat semua produk").
 * Aman dipakai dari server component (komponen ini client, props serializable)
 * sehingga section server-rendered tetap bisa melacak kliknya.
 */
export function TrackedLink({
  location,
  target,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  /** Konteks tempat tautan muncul, mis. "produk-section", "services". */
  location: string;
  /** Label tujuan untuk analitik; default = `href` bila string. */
  target?: string;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        const dest =
          target ?? (typeof props.href === "string" ? props.href : "");
        trackCtaClick(location, dest);
        onClick?.(e);
      }}
    />
  );
}
