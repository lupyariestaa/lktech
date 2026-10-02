"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { SidebarItem, type SidebarBadges, type SidebarVariant } from "./sidebar-item";

/**
 * Daftar menu sidebar — dikelompokkan per AdminNavGroup.
 *
 * - Grup utama tanpa label, sisanya diberi section label kecil.
 * - Saat nav dapat discroll, tepi atas/bawah diberi fade sebagai affordance
 *   (diukur ulang lewat ResizeObserver — callback async, aman dari aturan
 *   `set-state-in-effect`).
 * - `onNavigate` meneruskan guard unsaved + penutupan drawer dari shell.
 */
export function SidebarNav({
  pathname,
  variant = "expanded",
  badges,
  onNavigate,
}: {
  pathname: string;
  variant?: SidebarVariant;
  badges?: SidebarBadges;
  onNavigate: (href: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ top: false, bottom: false });

  const updateEdge = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 4;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
    setEdge((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, []);

  // Ukur ulang tepi saat ukuran nav berubah (mis. toggle rail, resize window).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateEdge());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdge]);

  return (
    <div className="relative min-h-0 flex-1">
      {/* Fade affordance tepi nav (muncul hanya saat ada konten tersembunyi) */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-white to-transparent transition-opacity",
          edge.top ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-white to-transparent transition-opacity",
          edge.bottom ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        ref={scrollRef}
        onScroll={updateEdge}
        className="flex h-full flex-col gap-1 overflow-y-auto px-4 pb-4"
      >
        {ADMIN_NAV.map((group, gi) => (
          <div key={group.id} className={cn("flex flex-col gap-1", gi > 0 && "mt-3")}>
            {group.label ? (
              variant === "rail" ? (
                <span className="sr-only">{group.label}</span>
              ) : (
                <p className="px-3.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  {group.label}
                </p>
              )
            ) : null}
            {group.items.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                pathname={pathname}
                variant={variant}
                badges={badges}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
