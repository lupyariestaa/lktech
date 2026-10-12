"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isAdminItemActive,
  type AdminNavItem,
  type NavBadgeKind,
} from "@/lib/admin-nav";
import type { SidebarBadges, SidebarVariant } from "./sidebar-item";

const BADGE_ARIA: Record<NavBadgeKind, (n: number) => string> = {
  newLeads: (n) => `${n} lead baru`,
  newOrders: (n) => `${n} pesanan baru`,
};

function formatBadge(n: number): string {
  return n > 99 ? "99+" : String(n);
}

/**
 * Item nav INDUK yang punya `children` — dirender sebagai accordion.
 *
 * - `expanded`: header (ikon + label + chevron) + daftar anak.
 * - `rail`: ikon; hover/klik membuka daftar anak (popover mini) — sederhana & aksesibel.
 * - Auto-buka bila salah satu anak aktif.
 */
export function SidebarAccordionItem({
  item,
  pathname,
  variant = "expanded",
  badges,
  isOpen,
  onToggle,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  variant?: SidebarVariant;
  badges?: SidebarBadges;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
}) {
  const { icon: Icon, label, title, badge, children = [] } = item;
  const badgeCount = badge && badges ? (badges[badge] ?? 0) : 0;
  const showBadge = badgeCount > 0;

  const anyChildActive = children.some((c) => isAdminItemActive(c.href, pathname));
  const selfActive = pathname === item.href;
  const active = anyChildActive || selfActive;

  const handleNav = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(href);
  };

  // ---- Rail: ikon dengan popover anak (hover/focus) ----
  const [popOpen, setPopOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (variant !== "rail" || !popOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPopOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [variant, popOpen]);

  if (variant === "rail") {
    return (
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setPopOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={popOpen}
          aria-label={label}
          title={title ?? label}
          className={cn(
            "relative flex h-11 w-full items-center justify-center rounded-xl transition-colors",
            active
              ? "bg-primary text-white shadow-sm shadow-primary/25"
              : "text-slate-500 hover:bg-primary-50 hover:text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
          {showBadge && badge && (
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
        </button>
        {popOpen && (
          <div
            role="menu"
            aria-label={title}
            className="absolute top-0 left-full z-50 ml-2 w-56 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl"
          >
            <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              {label}
            </p>
            {children.map((c) => {
              const childActive = isAdminItemActive(c.href, pathname);
              const CIcon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  role="menuitem"
                  aria-current={childActive ? "page" : undefined}
                  onClick={(e) => {
                    setPopOpen(false);
                    handleNav(c.href)(e);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                    childActive
                      ? "bg-primary-50 font-semibold text-primary"
                      : "text-slate-600 hover:bg-surface hover:text-secondary",
                  )}
                >
                  {CIcon && <CIcon className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---- Expanded: accordion ----
  const panelId = `navsub-${item.href.replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-white shadow-sm shadow-primary/25"
            : "text-slate-600 hover:bg-primary-50 hover:text-primary",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {showBadge && badge && (
          <>
            <span className="sr-only">, {BADGE_ARIA[badge](badgeCount)}</span>
            <span
              aria-hidden="true"
              className={cn(
                "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-none",
                active ? "bg-white/95 text-primary" : "bg-rose-500 text-white",
              )}
            >
              {formatBadge(badgeCount)}
            </span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            isOpen && "rotate-180",
            active ? "text-white/90" : "text-slate-400",
          )}
          aria-hidden="true"
        />
        {active && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-white/90"
          />
        )}
      </button>

      {isOpen && (
        <ul id={panelId} className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-slate-200 pl-2">
          {children.map((c) => {
            const childActive = isAdminItemActive(c.href, pathname);
            const CIcon = c.icon;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  aria-current={childActive ? "page" : undefined}
                  onClick={handleNav(c.href)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                    childActive
                      ? "bg-primary-50 font-semibold text-primary"
                      : "text-slate-500 hover:bg-surface hover:text-primary",
                  )}
                >
                  {CIcon && <CIcon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
