"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createCoupon,
  updateCoupon,
  type CouponFormInput,
} from "@/lib/admin-coupons-api";
import type { Coupon, CouponType } from "@/lib/coupon-types";
import { validateCouponForm, type CouponFormErrors } from "@/lib/coupon-pure";
import { useToast } from "@/components/admin/toast";
import { useDrawerFocus } from "@/components/admin/use-drawer-focus";
import { isoToLocal, localToIso } from "@/components/admin/coupons/datetime";
import { cn } from "@/lib/utils";

const EMPTY_FORM: CouponFormInput = {
  code: "",
  description: "",
  type: "percent",
  value: 10,
  minSpend: 0,
  appliesToSlugs: undefined,
  minItems: undefined,
  maxDiscount: undefined,
  startsAt: "",
  endsAt: "",
  usageLimit: undefined,
  limitPerUser: 1,
  active: true,
};

/** Form buat/edit kupon (dialog). */
export function CouponFormDialog({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = Boolean(coupon);
  const [form, setForm] = useState<CouponFormInput>(() =>
    coupon
      ? {
          code: coupon.code,
          description: coupon.description ?? "",
          type: coupon.type,
          value: coupon.value,
          minSpend: coupon.minSpend,
          appliesToSlugs: coupon.appliesToSlugs,
          minItems: coupon.minItems,
          maxDiscount: coupon.maxDiscount,
          startsAt: isoToLocal(coupon.startsAt),
          endsAt: isoToLocal(coupon.endsAt),
          usageLimit: coupon.usageLimit,
          limitPerUser: coupon.limitPerUser,
          active: coupon.active,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CouponFormErrors>({});
  // Focus-trap + kembalikan fokus ke pemicu saat ditutup (audit K8).
  const { ref: panelRef } = useDrawerFocus<HTMLFormElement>(true);

  // Escape menutup dialog (focus-trap ditangani `useDrawerFocus`).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof CouponFormInput>(k: K, v: CouponFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** Bangun payload final dari form (normalisasi). */
  const buildPayload = (): CouponFormInput => ({
    ...form,
    code: form.code.trim().toUpperCase(),
    startsAt: localToIso(form.startsAt),
    endsAt: localToIso(form.endsAt),
    appliesToSlugs:
      form.appliesToSlugs && form.appliesToSlugs.length ? form.appliesToSlugs : undefined,
    minItems:
      typeof form.minItems === "number" && form.minItems > 0 ? form.minItems : undefined,
    maxDiscount:
      form.type === "percent" && form.maxDiscount ? form.maxDiscount : undefined,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi klien (audit K4) — pesan per-field sebelum round-trip server.
    const payload = buildPayload();
    const validation = validateCouponForm({
      code: payload.code,
      type: payload.type,
      value: payload.value,
      minSpend: payload.minSpend,
      maxDiscount: payload.maxDiscount,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      usageLimit: payload.usageLimit,
      limitPerUser: payload.limitPerUser,
    });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setError("Periksa kembali isian yang ditandai.");
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && coupon) {
        await updateCoupon(coupon.id, payload);
        toast.success("Kupon diperbarui.");
      } else {
        await createCoupon(payload);
        toast.success("Kupon dibuat.");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kupon.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "text-xs font-semibold text-secondary";

  /** Atribut a11y untuk field (id error + aria). */
  const fieldA11y = (name: keyof CouponFormErrors) =>
    fieldErrors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `coupon-${name}-error` }
      : {};
  const fieldBorder = (name: keyof CouponFormErrors) =>
    fieldErrors[name] ? " border-rose-300" : "";
  // Catatan: sengaja berupa fungsi biasa (bukan komponen) agar tidak dianggap
  // komponen yang dibuat saat render (aturan React).
  const renderFieldError = (name: keyof CouponFormErrors) =>
    fieldErrors[name] ? (
      <span id={`coupon-${name}-error`} role="alert" className="text-[11px] text-rose-500">
        {fieldErrors[name]}
      </span>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit kupon" : "Buat kupon"}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        ref={panelRef}
        onSubmit={submit}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-secondary">
            {isEdit ? "Edit Kupon" : "Buat Kupon"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted hover:text-secondary"
          >
            Tutup
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelCls}>Kode Kupon</span>
              <input
                data-autofocus
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="PROMO10"
                className={cn(field, "font-mono tracking-wide", fieldBorder("code"))}
                {...fieldA11y("code")}
              />
              {renderFieldError("code")}
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelCls}>Deskripsi (opsional)</span>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Diskon launching"
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Jenis</span>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as CouponType)}
                className={field}
              >
                <option value="percent">Persen (%)</option>
                <option value="amount">Nominal (Rp)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>
                {form.type === "percent" ? "Diskon (%)" : "Diskon (Rp)"}
              </span>
              <input
                type="number"
                min={form.type === "percent" ? 1 : 0}
                max={form.type === "percent" ? 100 : undefined}
                value={form.value}
                onChange={(e) => set("value", Number(e.target.value))}
                className={cn(field, fieldBorder("value"))}
                {...fieldA11y("value")}
              />
              {renderFieldError("value")}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Min. Belanja (Rp)</span>
              <input
                type="number"
                min={0}
                value={form.minSpend}
                onChange={(e) => set("minSpend", Number(e.target.value))}
                className={cn(field, fieldBorder("minSpend"))}
                {...fieldA11y("minSpend")}
              />
              {renderFieldError("minSpend")}
            </label>

            {form.type === "percent" && (
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Maks. Diskon (Rp, opsional)</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscount ?? ""}
                  onChange={(e) =>
                    set("maxDiscount", e.target.value ? Number(e.target.value) : undefined)
                  }
                  className={cn(field, fieldBorder("maxDiscount"))}
                  {...fieldA11y("maxDiscount")}
                />
                {renderFieldError("maxDiscount")}
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Mulai (opsional)</span>
              <input
                type="datetime-local"
                value={form.startsAt ?? ""}
                onChange={(e) => set("startsAt", e.target.value)}
                className={cn(field, fieldBorder("startsAt"))}
                {...fieldA11y("startsAt")}
              />
              {renderFieldError("startsAt")}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Berakhir (opsional)</span>
              <input
                type="datetime-local"
                value={form.endsAt ?? ""}
                onChange={(e) => set("endsAt", e.target.value)}
                className={cn(field, fieldBorder("endsAt"))}
                {...fieldA11y("endsAt")}
              />
              {renderFieldError("endsAt")}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Kuota Total (kosong = ∞)</span>
              <input
                type="number"
                min={1}
                value={form.usageLimit ?? ""}
                onChange={(e) =>
                  set("usageLimit", e.target.value ? Number(e.target.value) : undefined)
                }
                className={cn(field, fieldBorder("usageLimit"))}
                {...fieldA11y("usageLimit")}
              />
              {renderFieldError("usageLimit")}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Batas per User (0 = tanpa batas)</span>
              <input
                type="number"
                min={0}
                value={form.limitPerUser ?? 0}
                onChange={(e) => set("limitPerUser", Math.max(0, Number(e.target.value)))}
                className={cn(field, fieldBorder("limitPerUser"))}
                {...fieldA11y("limitPerUser")}
              />
              {renderFieldError("limitPerUser")}
            </label>
          </div>

          {/* ===== Kupon Bundel (FASE P3) ===== */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-surface p-4">
            <p className="text-sm font-semibold text-secondary">Kupon Bundel (opsional)</p>
            <p className="mt-0.5 text-xs text-muted">
              Batasi kupon agar hanya berlaku untuk produk/jumlah item tertentu.
              Kosongkan kedua-duanya bila kupon berlaku umum.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Wajib ada produk (slug, 1 per baris)</span>
                <textarea
                  rows={3}
                  value={(form.appliesToSlugs ?? []).join("\n")}
                  onChange={(e) =>
                    set(
                      "appliesToSlugs",
                      e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder={"template-landing-page-bisnis\naplikasi-kasir-sederhana"}
                  className={cn(field, "resize-none font-mono text-xs")}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Minimal jumlah item (qty)</span>
                <input
                  type="number"
                  min={0}
                  value={form.minItems ?? ""}
                  onChange={(e) =>
                    set("minItems", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="mis. 2"
                  className={field}
                />
              </label>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            Aktifkan kupon ini
          </label>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Buat Kupon"}
          </button>
        </div>
      </form>
    </div>
  );
}
