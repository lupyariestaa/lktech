"use client";

import type { ComponentProps } from "react";
import { ButtonAnchor } from "@/components/ui/button";
import { trackWhatsAppClick } from "@/lib/analytics";

/**
 * Tombol WhatsApp yang otomatis mencatat event analitik saat diklik.
 *
 * Pembungkus tipis di atas `ButtonAnchor` agar CTA WhatsApp (sumber konversi
 * utama) bisa dilacak tanpa mengubah setiap pemanggil menjadi client component.
 * Aman dipakai dari server component (komponen ini client, props serializable).
 */
export function TrackedWaButton({
  location,
  label,
  onClick,
  ...props
}: ComponentProps<typeof ButtonAnchor> & {
  /** Konteks tempat tombol muncul, mis. "navbar", "pricing", "layanan-detail". */
  location: string;
  /** Label opsional (mis. nama layanan/paket). */
  label?: string;
}) {
  return (
    <ButtonAnchor
      {...props}
      onClick={(e) => {
        trackWhatsAppClick(location, label);
        onClick?.(e);
      }}
    />
  );
}
