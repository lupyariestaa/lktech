"use client";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { SETTINGS_NAV } from "@/lib/settings-nav";

/**
 * Kerangka halaman Pengaturan: judul + deskripsi + konten.
 *
 * Daftar sub-menu TIDAK ditampilkan di halaman — navigasi antar bagian pengaturan
 * dilakukan lewat **sidebar** (accordion). Di sini hanya tautan kecil
 * "Kembali ke Pengaturan" untuk halaman anak.
 */
export function SettingsShell({
  current,
  children,
}: {
  /** Slug route aktif (mis. "kontak"); "" untuk induk/ringkasan. */
  current: string;
  children: React.ReactNode;
}) {
  const active = SETTINGS_NAV.find((n) => n.slug === current) ?? SETTINGS_NAV[0];
  const isRoot = current === "";

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        {isRoot ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        ) : (
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Pengaturan
          </Link>
        )}
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold text-secondary">
          {!isRoot && (
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary">
              <Settings className="h-4 w-4" />
            </span>
          )}
          {active.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{active.desc}</p>
      </div>

      {children}
    </div>
  );
}
