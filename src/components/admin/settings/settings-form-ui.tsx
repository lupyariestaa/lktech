"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Komponen UI bersama untuk form Pengaturan (gap G23) — menghapus duplikasi
 * pola `field`/tombol Simpan/badge Tersimpan/banner error yang sebelumnya
 * disalin di banyak komponen.
 */

/** Kelas input standar (border + focus ring). */
export const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/** Tambahan kelas saat field error (border merah). */
export const fieldErrorClass = "border-rose-300 focus:ring-rose-300/40";

/** Banner error form (dengan catatan "muat ulang" bila load gagal). */
export function FormErrorBanner({
  message,
  loadFailed,
}: {
  message: string | null;
  loadFailed?: boolean;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {message}
        {loadFailed && (
          <span className="mt-1 block text-xs text-rose-500">
            Muat ulang halaman sebelum menyimpan.
          </span>
        )}
      </span>
    </div>
  );
}

/** Tombol Simpan + badge "Tersimpan" (aria-live). */
export function SaveRow({
  onSave,
  saving,
  saved,
  disabled = false,
  label = "Simpan",
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        {label}
      </button>
      {saved && (
        <span
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tersimpan
        </span>
      )}
    </div>
  );
}

/** Kartu section form (border + padding konsisten). */
export function FormSection({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
        {icon}
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Field berlabel + pesan error opsional (a11y: aria-invalid/describedby). */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-secondary">{label}</span>
      {children}
      {error ? (
        <span id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-rose-600">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
