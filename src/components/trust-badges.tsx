"use client";

import { BadgeCheck, Lock, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trust badges (FASE P4) — penanda kepercayaan yang JUJUR (tanpa klaim palsu):
 * - Pembayaran aman (QRIS/VA/e-wallet via gateway resmi).
 * - Diproses otomatis 24/7 (produk digital).
 * - Garansi/kebijakan — ditampilkan sesuai konfigurasi.
 *
 * `variant`:
 * - "instan" (default): produk digital → badge pembayaran + proses otomatis.
 * - "jasa": layanan jasa → badge konsultasi/konfirmasi manual.
 * - "compact": versi ringkas untuk kartu/keranjang.
 *
 * `refundNote` (opsional): bila diisi, tampilkan badge garansi/kebijakan.
 */
export function TrustBadges({
  variant = "instan",
  refundNote,
  className,
}: {
  variant?: "instan" | "jasa" | "compact";
  refundNote?: string;
  className?: string;
}) {
  const items =
    variant === "jasa"
      ? [
          { icon: BadgeCheck, label: "Dikonfirmasi manual oleh tim ahli" },
          { icon: Lock, label: "Pembayaran setelah kesepakatan" },
        ]
      : variant === "compact"
        ? [
            { icon: Lock, label: "Pembayaran aman (QRIS/VA/e-wallet)" },
            { icon: Zap, label: "Akses otomatis setelah bayar" },
          ]
        : [
            { icon: Lock, label: "Pembayaran aman (QRIS/VA/e-wallet)" },
            { icon: Zap, label: "Diproses otomatis 24/7" },
            { icon: BadgeCheck, label: "Link unduhan berlisensi" },
          ];

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2",
        className,
      )}
    >
      {items.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted"
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          {label}
        </li>
      ))}
      {refundNote && (
        <li className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <RotateCcw className="h-3.5 w-3.5 shrink-0 text-primary" />
          {refundNote}
        </li>
      )}
    </ul>
  );
}
