"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import type { SidebarBadges, SidebarVariant } from "./sidebar-item";

/**
 * Isi sidebar yang dipakai bersama oleh sidebar desktop & drawer mobile:
 * brand → nav (grup + badge) → footer (Lihat Website + menu akun).
 *
 * `variant="rail"` menampilkan versi icon-only lebar 80px.
 * `onNavigate` = guard unsaved + (drawer) tutup drawer.
 */
export function SidebarContent({
  variant = "expanded",
  pathname,
  badges,
  user,
  onNavigate,
  onClose,
  onLogout,
}: {
  variant?: SidebarVariant;
  pathname: string;
  badges?: SidebarBadges;
  user: User | null;
  /** Navigasi internal (melewati guard unsaved). */
  onNavigate: (href: string) => void;
  /** Ditampilkan hanya pada drawer (tombol tutup). */
  onClose?: () => void;
  onLogout: () => Promise<void>;
}) {
  const rail = variant === "rail";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex items-center justify-between p-4 pb-3",
          rail && "justify-center px-0",
        )}
      >
        <Link
          href="/admin"
          aria-label="Beranda admin"
          title={rail ? "Admin Panel" : undefined}
          onClick={(e) => {
            // Biarkan modifier-click native; navigasi internal lewat guard.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onNavigate("/admin");
          }}
          className={cn("flex items-center gap-2.5 rounded-xl", rail && "mx-auto")}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-white">
            LK
          </span>
          {!rail && (
            <span className="text-sm font-bold text-secondary">Admin Panel</span>
          )}
        </Link>

        {onClose && (
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <SidebarNav
        pathname={pathname}
        variant={variant}
        badges={badges}
        onNavigate={onNavigate}
      />

      {/* Footer */}
      <div className={cn("border-t border-slate-200 p-4 pt-3", rail && "px-2")}>
        {rail ? (
          <div className="flex flex-col items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="Lihat Website"
              aria-label="Lihat Website (buka tab baru)"
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-surface hover:text-primary"
            >
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </a>
            <UserMenu user={user} rail onLogout={onLogout} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Lihat Website
            </a>
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        )}
      </div>
    </div>
  );
}
