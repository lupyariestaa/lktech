"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  BookOpen,
  ExternalLink,
  LogOut,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { signOutUser } from "@/lib/auth";
import { clearToolsLocalData } from "@/lib/tools-storage";

/**
 * Footer sidebar: tautan keluar dashboard, akun, dan kontrol data lokal.
 *
 * "Hapus data lokal" memakai konfirmasi inline (bukan `window.confirm`) agar
 * tetap aksesibel dan tidak memblokir browser. Setelah dihapus, store lokal
 * mengirim event sehingga sidebar & dashboard langsung kosong.
 */
export function ToolsSidebarFooter({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { user } = useAuth();
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const displayName = user?.displayName?.trim() || "Akun saya";
  const email = user?.email ?? "Sesi aktif di perangkat ini";
  const initial = (displayName || email || "L").slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    if (signingOut) return;
    setSignOutError("");
    setSigningOut(true);
    try {
      await signOutUser();
      // UserGuard akan mengarahkan ke /masuk?next=... setelah sesi berakhir.
    } catch {
      setSigningOut(false);
      setSignOutError("Tidak dapat keluar. Periksa koneksi lalu coba lagi.");
    }
  };

  const clearLocal = () => {
    clearToolsLocalData();
    setConfirmClear(false);
    setNotice("Data lokal tools dihapus.");
  };

  const feedbackId = "tools-sidebar-feedback";

  return (
    <div
      className={`shrink-0 border-t border-slate-100 py-3 ${collapsed ? "px-1.5" : "px-2"}`}
    >
      <div className="space-y-0.5">
        <Link
          href="/tools/panduan"
          onClick={onNavigate}
          title={collapsed ? "Panduan" : undefined}
          className={`flex min-h-11 items-center rounded-lg text-[12px] font-medium text-slate-500 transition-colors hover:bg-surface hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {collapsed ? <span className="sr-only">Panduan</span> : "Panduan"}
        </Link>
        <Link
          href="/tools"
          onClick={onNavigate}
          title={collapsed ? "Kembali ke situs" : undefined}
          className={`flex min-h-11 items-center rounded-lg text-[12px] font-medium text-slate-500 transition-colors hover:bg-surface hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {collapsed ? (
            <span className="sr-only">Kembali ke situs</span>
          ) : (
            "Kembali ke situs"
          )}
        </Link>
      </div>

      <div className={`mt-2 rounded-xl bg-surface ${collapsed ? "p-1.5" : "p-2.5"}`}>
        <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "gap-2"}`}>
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-light text-xs font-bold text-white"
          >
            {initial}
          </span>
          <div className={`min-w-0 flex-1 ${collapsed ? "sr-only" : ""}`}>
            <p className="truncate text-[11px] font-bold text-secondary">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-muted">{email}</p>
          </div>
          <Link
            href="/akun"
            onClick={onNavigate}
            aria-label="Buka akun saya"
            title={collapsed ? "Buka akun saya" : undefined}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Keluar dari akun"
              title={collapsed ? "Keluar dari akun" : undefined}
              aria-describedby={signOutError ? feedbackId : undefined}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className={`mt-2 ${collapsed ? "px-0" : "px-1"}`}>
        {confirmClear ? (
          <div className="rounded-lg border border-rose-100 bg-rose-50/70 p-2">
            <p className="text-[10px] leading-relaxed text-rose-700">
              {collapsed
                ? "Hapus data lokal?"
                : "Hapus favorit, riwayat, dan hitungan?"}
            </p>
            <div className={`mt-1.5 flex gap-1.5 ${collapsed ? "flex-col" : ""}`}>
              <button
                type="button"
                onClick={clearLocal}
                aria-label="Konfirmasi hapus data lokal"
                className="min-h-11 rounded-md bg-rose-600 px-2.5 text-[10px] font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
              >
                {collapsed ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Hapus</span>
                  </>
                ) : (
                  "Hapus"
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                aria-label="Batalkan hapus data lokal"
                className="min-h-11 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-500 transition-colors hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                {collapsed ? (
                  <>
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Batal</span>
                  </>
                ) : (
                  "Batal"
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            aria-label="Hapus data lokal"
            title={collapsed ? "Hapus data lokal" : undefined}
            className={`inline-flex min-h-11 items-center rounded-md text-[10px] font-semibold text-slate-500 transition-colors hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${collapsed ? "w-full justify-center px-0" : "gap-1.5 px-2"}`}
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            {collapsed ? (
              <span className="sr-only">Hapus data lokal</span>
            ) : (
              "Hapus data lokal"
            )}
          </button>
        )}
      </div>

      {signOutError && (
        <p
          role="alert"
          id={feedbackId}
          className="mx-1 mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-xs leading-relaxed text-rose-700"
        >
          {signOutError}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {notice}
      </p>
    </div>
  );
}
