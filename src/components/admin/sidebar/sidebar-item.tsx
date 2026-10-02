"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  isAdminItemActive,
  type AdminNavItem,
  type NavBadgeKind,
} from "@/lib/admin-nav";

export type SidebarVariant = "expanded" | "rail";

/** Daftar nilai badge aktif (key = jenis badge di config nav). */
export type SidebarBadges = Partial<Record<NavBadgeKind, number>>;

const BADGE_ARIA: Record<NavBadgeKind, (n: number) => string> = {
  newLeads: (n) => `${n} lead baru`,
  newOrders: (n) => `${n} pesanan baru`,
};

/** Format angka badge dengan batas atas (mis. 99+). */
function formatBadge(n: number): string {
  return n > 99 ? "99+" : String(n);
}

function BadgePill({ count, tone }: { count: number; tone: "onItem" | "standalone" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-none",
        tone === "onItem" ? "bg-white/95 text-primary" : "bg-rose-500 text-white",
      )}
    >
      {formatBadge(count)}
    </span>
  );
}

/**
 * Satu item menu sidebar.
 *
 * - `expanded`: icon + label + badge pill di kanan.
 * - `rail`: hanya icon (tooltip native + aria-label), badge mini di pojok icon.
 * - Item aktif mendapat marker vertikal di sisi kiri (mempercepat scanning).
 * - Klik dengan modifier (Ctrl/Cmd/Shift/Alt) dibiarkan native → tab baru.
 */
export function SidebarItem({
  item,
  pathname,
  variant = "expanded",
  badges,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  variant?: SidebarVariant;
  badges?: SidebarBadges;
  /** Dipanggil untuk navigasi internal (lewat guard unsaved + tutup drawer). */
  onNavigate: (href: string) => void;
}) {
  const { icon: Icon, label, href, title, badge } = item;
  const active = isAdminItemActive(href, pathname);
  const badgeCount = badge && badges ? (badges[badge] ?? 0) : 0;
  const showBadge = badgeCount > 0;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Hormati interaksi native: buka di tab/jendela baru biarkan browser.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onNavigate(href);
  };

  if (variant === "rail") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={showBadge && badge ? `${label} — ${BADGE_ARIA[badge](badgeCount)}` : label}
        title={title ?? label}
        onClick={handleClick}
        className={cn(
          "relative flex h-11 w-full items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-primary text-white shadow-sm shadow-primary/25"
            : "text-slate-500 hover:bg-primary-50 hover:text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
        {showBadge && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"
          >
            {formatBadge(badgeCount)}
          </span>
        )}
        {active && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-white/90"
          />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={handleClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-white shadow-sm shadow-primary/25"
          : "text-slate-600 hover:bg-primary-50 hover:text-primary",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showBadge && badge && (
        <>
          {/* Nama aksesibel lengkap untuk link ("Lead, 3 lead baru"). */}
          <span className="sr-only">, {BADGE_ARIA[badge](badgeCount)}</span>
          <span aria-hidden="true" className="shrink-0">
            <BadgePill count={badgeCount} tone={active ? "onItem" : "standalone"} />
          </span>
        </>
      )}
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-white/90"
        />
      )}
    </Link>
  );
}
