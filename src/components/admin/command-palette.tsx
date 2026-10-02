"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CornerDownLeft, ExternalLink, LogOut, Search } from "lucide-react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type PaletteAction = {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  /** href internal (lewat guard unsaved) atau aksi custom. */
  href?: string;
  action?: "logout" | "external";
};

/**
 * Command palette (Ctrl/Cmd+K) untuk navigasi cepat dashboard.
 *
 * - Sumber item: seluruh menu admin + aksi "Lihat Website" & "Keluar".
 * - Filter substring case-insensitive pada label/hint.
 * - Keyboard: ↑/↓ navigasi, Enter pilih, Escape tutup; fokus tetap di dialog.
 * - Reset query saat transisi tertutup → terbuka dilakukan saat render
 *   (pola `prevOpen`, konvensi repo — bukan setState di effect).
 */
export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  /** Navigasi internal — lewat guard unsaved di shell. */
  onNavigate: (href: string) => void;
  onLogout: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = useMemo<PaletteAction[]>(
    () => [
      ...ADMIN_NAV_ITEMS.map((item) => ({
        id: `nav:${item.href}`,
        label: item.title,
        hint: `Buka ${item.label}`,
        icon: item.icon,
        href: item.href,
      })),
      {
        id: "action:website",
        label: "Lihat Website",
        hint: "Buka situs publik di tab baru",
        icon: ExternalLink,
        action: "external",
      },
      {
        id: "action:logout",
        label: "Keluar",
        hint: "Akhiri sesi admin",
        icon: LogOut,
        action: "logout",
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Reset saat transisi tertutup → terbuka (render-phase, tanpa effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  // Clamp indeks aktif saat hasil filter menyusut (render-phase — nilai selalu
  // valid sebelum paint, idempoten).
  const safeActive = Math.min(active, Math.max(0, filtered.length - 1));
  if (safeActive !== active) setActive(safeActive);

  // Fokus input & scroll item aktif ke terlihat (sinkronisasi DOM — boleh effect).
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [safeActive]);

  const run = (a: PaletteAction) => {
    if (a.href) {
      onNavigate(a.href);
      onClose();
      return;
    }
    if (a.action === "external") {
      window.open("/", "_blank", "noopener,noreferrer");
      onClose();
      return;
    }
    if (a.action === "logout") {
      onClose();
      void onLogout();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActive((i) => {
        const delta = e.key === "ArrowDown" ? 1 : -1;
        return (i + delta + filtered.length) % filtered.length;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[safeActive];
      if (target) run(target);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[13000] flex items-start justify-center px-4 pt-[10vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian menu"
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onKeyDown={onKeyDown}
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-list"
                aria-activedescendant={
                  filtered[safeActive]
                    ? `palette-item-${filtered[safeActive].id}`
                    : undefined
                }
                aria-label="Cari menu atau aksi"
                placeholder="Cari menu atau aksi…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent py-3.5 text-sm text-secondary placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block">
                ESC
              </kbd>
            </div>

            {/* Hasil */}
            <div
              ref={listRef}
              id="command-palette-list"
              role="listbox"
              aria-label="Hasil pencarian"
              className="max-h-72 overflow-y-auto p-1.5"
            >
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  Tidak ada hasil untuk “{query}”.
                </p>
              ) : (
                filtered.map((a, i) => {
                  const Icon = a.icon;
                  const isActive = i === safeActive;
                  return (
                    <button
                      key={a.id}
                      id={`palette-item-${a.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(a)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary"
                          : "text-slate-600 hover:bg-surface",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {a.label}
                      </span>
                      <span className="hidden shrink-0 text-xs text-muted sm:block">
                        {a.hint}
                      </span>
                      {isActive ? (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-slate-200 bg-surface px-1 py-0.5 font-semibold">↑↓</kbd>
                navigasi
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-slate-200 bg-surface px-1 py-0.5 font-semibold">↵</kbd>
                buka
              </span>
              <span className="ml-auto">LKTech Admin</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
