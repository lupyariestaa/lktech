"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createCouponBatch } from "@/lib/admin-coupons-api";
import type { CouponType } from "@/lib/coupon-types";
import { useToast } from "@/components/admin/toast";
import { useDrawerFocus } from "@/components/admin/use-drawer-focus";
import { cn } from "@/lib/utils";

/** Dialog generate massal kode kupon unik (C4/K4). */
export function BatchDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { ref: panelRef } = useDrawerFocus<HTMLFormElement>(true);
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState(10);
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState(10);
  const [minSpend, setMinSpend] = useState(0);
  const [limitPerUser, setLimitPerUser] = useState(1);
  const [campaign, setCampaign] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const field =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "text-xs font-semibold text-secondary";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prefix.trim()) {
      setError("Prefix kode wajib diisi.");
      return;
    }
    if (count < 1 || count > 500) {
      setError("Jumlah kode 1–500.");
      return;
    }
    if (type !== "percent" && type !== "amount") {
      setError("Jenis diskon tidak valid.");
      return;
    }
    setSaving(true);
    try {
      const res = await createCouponBatch({
        count,
        prefix: prefix.trim(),
        settings: {
          type,
          value,
          minSpend,
          limitPerUser,
          campaign: campaign.trim() || undefined,
          active: true,
        },
      });
      const msg = `${res.created.length} kupon dibuat${
        res.failed.length ? `, ${res.failed.length} gagal` : ""
      }.`;
      if (res.failed.length) toast.error(msg);
      else toast.success(msg);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kupon massal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Buat kupon massal"
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
          <h2 className="text-sm font-bold text-secondary">Buat Kupon Massal</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted hover:text-secondary"
          >
            Tutup
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs text-muted">
            Membuat banyak kode unik dengan pengaturan diskon yang sama. Kode =
            prefix + akhiran acak.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Prefix kode</span>
              <input
                data-autofocus
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="PROMO"
                className={cn(field, "font-mono tracking-wide")}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Jumlah (1–500)</span>
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Jenis</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CouponType)}
                className={field}
              >
                <option value="percent">Persen (%)</option>
                <option value="amount">Nominal (Rp)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>
                {type === "percent" ? "Diskon (%)" : "Diskon (Rp)"}
              </span>
              <input
                type="number"
                min={type === "percent" ? 1 : 0}
                max={type === "percent" ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Min. Belanja (Rp)</span>
              <input
                type="number"
                min={0}
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Batas per User (0 = tanpa batas)</span>
              <input
                type="number"
                min={0}
                value={limitPerUser}
                onChange={(e) => setLimitPerUser(Math.max(0, Number(e.target.value)))}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelCls}>Kampanye (opsional)</span>
              <input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="mis. Ramadan 2026"
                className={field}
              />
            </label>
          </div>

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
            Buat {count} Kupon
          </button>
        </div>
      </form>
    </div>
  );
}
