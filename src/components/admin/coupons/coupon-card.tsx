"use client";

import Link from "next/link";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { COUPON_TYPE_LABEL, type Coupon } from "@/lib/coupon-types";
import type { CouponStat } from "@/lib/admin-coupons-api";
import { formatRupiah } from "@/lib/format";
import { isoToLocal } from "@/components/admin/coupons/datetime";
import { cn } from "@/lib/utils";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-secondary">{value}</dd>
    </div>
  );
}

/** Label nilai kupon (persen/nominal/bertingkat). */
function valueLabel(c: Coupon): string {
  if (c.type === "tiered") return `${c.tiers?.length ?? 0} tingkat`;
  return c.type === "percent" ? `${c.value}%` : formatRupiah(c.value);
}

/** Kartu satu kupon di daftar admin (menu kupon). */
export function CouponCard({
  coupon: c,
  stat,
  busy,
  onToggleActive,
  onEdit,
  onArchive,
  onRestore,
  onDuplicate,
}: {
  coupon: Coupon;
  stat?: CouponStat;
  busy: boolean;
  onToggleActive: (c: Coupon) => void;
  onEdit: (c: Coupon) => void;
  onArchive: (c: Coupon) => void;
  onRestore: (c: Coupon) => void;
  onDuplicate: (c: Coupon) => void;
}) {
  return (
    <li
      className={cn(
        "rounded-2xl border bg-white p-4",
        c.archived ? "border-slate-200 opacity-80" : c.active ? "border-slate-200" : "border-slate-200 opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/coupons/${c.id}`}
              className="rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-white transition-opacity hover:opacity-90"
            >
              {c.code}
            </Link>
            {c.archived ? (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                Diarsipkan
              </span>
            ) : (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  c.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
                )}
              >
                {c.active ? "Aktif" : "Nonaktif"}
              </span>
            )}
          </div>
          {c.description && <p className="mt-2 text-xs text-muted">{c.description}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-primary">{valueLabel(c)}</p>
          <p className="text-[10px] text-muted">{COUPON_TYPE_LABEL[c.type]}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-3">
        <Info label="Min. belanja" value={c.minSpend > 0 ? formatRupiah(c.minSpend) : "—"} />
        <Info
          label="Maks. diskon"
          value={c.type === "percent" && c.maxDiscount ? formatRupiah(c.maxDiscount) : "—"}
        />
        <Info label="Kuota" value={`${c.usageCount}/${c.usageLimit ?? "∞"}`} />
        <Info label="Per user" value={c.limitPerUser === 0 ? "∞" : `${c.limitPerUser}×`} />
        <Info label="Mulai" value={c.startsAt ? isoToLocal(c.startsAt).replace("T", " ") : "—"} />
        <Info label="Berakhir" value={c.endsAt ? isoToLocal(c.endsAt).replace("T", " ") : "—"} />
        {c.campaign && <Info label="Kampanye" value={c.campaign} />}
        {(c.appliesToSlugs?.length || c.minItems) && (
          <Info
            label="Bundel"
            value={[
              c.appliesToSlugs?.length ? `${c.appliesToSlugs.length} produk` : null,
              c.minItems ? `min ${c.minItems} item` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </dl>

      <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 rounded-xl bg-surface px-3 py-2 text-[11px]">
        <div title="Jumlah pesanan aktif (tidak dibatalkan) yang memakai kupon ini">
          <dt className="text-muted">Order aktif</dt>
          <dd className="font-semibold text-secondary">
            {String(stat?.activeOrders ?? 0)}
            <span className="ml-1 text-slate-400">/{stat?.orderCount ?? 0}</span>
          </dd>
        </div>
        <Info label="Σ diskon" value={formatRupiah(stat?.totalDiscount ?? 0)} />
        <Info label="Dibatalkan" value={String(stat?.cancelledOrders ?? 0)} />
      </dl>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onDuplicate(c)}
          disabled={busy}
          aria-label={`Duplikat kupon ${c.code}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {c.archived ? (
          <button
            type="button"
            onClick={() => onRestore(c)}
            disabled={busy}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            Pulihkan
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onToggleActive(c)}
              disabled={busy}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {c.active ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button
              type="button"
              onClick={() => onEdit(c)}
              aria-label={`Edit kupon ${c.code}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onArchive(c)}
              aria-label={`Arsipkan kupon ${c.code}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
