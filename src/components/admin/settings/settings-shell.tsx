"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SETTINGS_NAV } from "@/lib/settings-nav";
import { cn } from "@/lib/utils";

/**
 * Kerangka halaman Pengaturan: judul + deskripsi + navigasi tab anak
 * (reuse konsep submenu, tapi sebagai tab horizontal di dalam konten) + konten.
 *
 * Navigasi tab menautkan ke route anak — halaman masing-masing punya fungsinya.
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

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold text-secondary">{active.title}</h1>
        <p className="mt-1 text-sm text-muted">{active.desc}</p>
      </div>

      {/* Tab anak */}
      <nav
        aria-label="Navigasi pengaturan"
        className="mb-5 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3"
      >
        {SETTINGS_NAV.map((n) => {
          const Icon = n.icon;
          const isActive = n.slug === current;
          return (
            <Link
              key={n.slug || "root"}
              href={n.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/25"
                  : "text-slate-600 hover:bg-primary-50 hover:text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
