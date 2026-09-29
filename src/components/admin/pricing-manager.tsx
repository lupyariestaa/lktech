"use client";

import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import { useSiteContent } from "@/components/admin/use-site-content";
import type { ManagedPricing } from "@/lib/content-types";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

export function PricingManager() {
  const { content, loading, saving, error, setError, reload, commit } =
    useSiteContent();
  const [draft, setDraft] = useState<ManagedPricing[] | null>(null);

  const list = draft ?? content.pricing;
  const dirty = draft !== null;

  const addPlan = () =>
    setDraft([
      ...list,
      { name: "", description: "", features: [], highlight: false },
    ]);

  const updatePlan = (i: number, patch: Partial<ManagedPricing>) =>
    setDraft(list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const removePlan = (i: number) =>
    setDraft(list.filter((_, j) => j !== i));

  const saveAll = async () => {
    if (!draft) return;
    const cleaned = draft.filter((p) => p.name.trim());
    if (cleaned.length === 0) {
      setError("Minimal satu paket harus memiliki nama.");
      return;
    }
    // Pastikan hanya satu paket yang jadi "highlight".
    const firstHighlight = cleaned.findIndex((p) => p.highlight);
    const normalized = cleaned.map((p, i) => ({
      ...p,
      highlight: firstHighlight >= 0 ? i === firstHighlight : false,
    }));
    const ok = await commit(
      { pricing: normalized },
      { successMessage: "Paket harga berhasil disimpan." },
    );
    if (ok) setDraft(null);
  };

  const reloadAll = async () => {
    setDraft(null);
    await reload();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat paket harga…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{list.length} paket</p>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", saving && "animate-spin")} />
            Muat ulang
          </button>
          <button
            onClick={addPlan}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
          <button
            onClick={saveAll}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            Belum ada paket harga. Klik &quot;Tambah&quot; untuk mulai.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((plan, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => updatePlan(i, { highlight: !plan.highlight })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    plan.highlight
                      ? "border-primary/30 bg-primary-50 text-primary"
                      : "border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary",
                  )}
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      plan.highlight && "fill-primary",
                    )}
                  />
                  {plan.highlight ? "Paling Populer" : "Jadikan populer"}
                </button>
                <button
                  type="button"
                  onClick={() => removePlan(i)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <input
                value={plan.name}
                onChange={(e) => updatePlan(i, { name: e.target.value })}
                placeholder="Nama paket"
                className={cn(fieldBase, "mt-3")}
              />
              <textarea
                rows={2}
                value={plan.description}
                onChange={(e) => updatePlan(i, { description: e.target.value })}
                placeholder="Deskripsi singkat"
                className={cn(fieldBase, "mt-2 resize-none")}
              />
              <textarea
                rows={4}
                value={plan.features.join("\n")}
                onChange={(e) =>
                  updatePlan(i, {
                    features: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Fitur (1 per baris)"
                className={cn(fieldBase, "mt-2 resize-none")}
              />
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <p className="text-xs text-amber-600">
          Ada perubahan yang belum disimpan.
        </p>
      )}
    </div>
  );
}
