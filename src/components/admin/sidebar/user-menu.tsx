"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, LogOut } from "lucide-react";
import type { User } from "firebase/auth";
import { cn } from "@/lib/utils";

/**
 * Avatar bulat admin: foto Google bila ada, fallback inisial.
 * `size` = kelas dimensi (mis. "h-9 w-9").
 */
function AdminAvatar({ user, size }: { user: User | null; size: string }) {
  const photo = user?.photoURL;
  const name = user?.displayName ?? user?.email ?? "Admin";
  const initial = name.charAt(0).toUpperCase();
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", size)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white",
        size,
      )}
    >
      {initial}
    </span>
  );
}

/**
 * Menu akun di footer sidebar (pola dashboard modern: Linear/Vercel/Supabase).
 *
 * Aksesibel: tombol `aria-haspopup="menu"` + `aria-expanded`; menu `role="menu"`
 * dengan item `role="menuitem"`; tutup via Escape/klik-luar/pilih item; fokus
 * dikembalikan ke tombol saat ditutup.
 */
export function UserMenu({
  user,
  rail = false,
  onLogout,
}: {
  user: User | null;
  rail?: boolean;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Tutup saat klik di luar menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Escape menutup & fokus kembali; navigasi arrow di dalam menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement & HTMLAnchorElement>(
          '[role="menuitem"]:not([disabled])',
        ) ?? [],
      );
      if (items.length === 0) return;
      const idx = items.indexOf(document.activeElement as typeof items[number]);
      const next =
        e.key === "ArrowDown"
          ? items[(idx + 1 + items.length) % items.length]
          : items[(idx - 1 + items.length) % items.length];
      next.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onLogout();
    } finally {
      setBusy(false);
      close();
    }
  };

  const name = user?.displayName ?? user?.email ?? "Admin";

  // ── Mode rail: hanya avatar bulat ─────────────────────────────────
  if (rail) {
    return (
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`Menu akun: ${name}`}
          title={name}
          className="mx-auto grid h-10 w-10 place-items-center overflow-hidden rounded-full transition-transform hover:scale-105"
        >
          <AdminAvatar user={user} size="h-10 w-10" />
        </button>
        {open && (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Menu akun"
            className="absolute bottom-0 left-full z-50 ml-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
          >
            <UserMenuBody user={user} busy={busy} onLogout={logout} onAfterNavigate={close} />
          </div>
        )}
      </div>
    );
  }

  // ── Mode expanded ─────────────────────────────────────────────────
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface"
      >
        <AdminAvatar user={user} size="h-9 w-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-secondary">
            {name}
          </span>
          {user?.email && (
            <span className="block truncate text-xs text-muted">{user.email}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Menu akun"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <UserMenuBody user={user} busy={busy} onLogout={logout} onAfterNavigate={close} />
        </div>
      )}
    </div>
  );
}

/** Isi dropdown (dipakai mode rail & expanded). */
function UserMenuBody({
  user,
  busy,
  onLogout,
  onAfterNavigate,
}: {
  user: User | null;
  busy: boolean;
  onLogout: () => Promise<void>;
  onAfterNavigate: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <AdminAvatar user={user} size="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-secondary">
            {user?.displayName ?? "Admin"}
          </p>
          <p className="truncate text-xs text-muted">{user?.email ?? "—"}</p>
        </div>
      </div>
      <div className="p-1.5">
        <a
          role="menuitem"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onAfterNavigate}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
          Lihat Website
        </a>
        <button
          role="menuitem"
          type="button"
          disabled={busy}
          onClick={onLogout}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            "text-rose-600 hover:bg-rose-50 disabled:opacity-60",
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Keluar
        </button>
      </div>
    </div>
  );
}
