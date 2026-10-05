import { adminFetch } from "@/lib/admin-fetch";
import {
  COUPON_TYPE_LABEL,
  type Coupon,
  type CouponType,
  type CouponsSummary,
} from "@/lib/coupon-types";
import { formatRupiah } from "@/lib/format";

/** Daftar kupon (admin). */
export async function fetchCoupons(): Promise<Coupon[]> {
  const data = await adminFetch<{ coupons: Coupon[] }>("/api/admin/coupons");
  return data.coupons;
}

/** Ringkasan statistik kupon. */
export async function fetchCouponsSummary(): Promise<CouponsSummary> {
  const data = await adminFetch<{ summary: CouponsSummary }>(
    "/api/admin/coupons?summary=1",
  );
  return data.summary;
}

/** Statistik dampak per-kupon (`KP-M2`): jumlah order & Σ diskon. */
export type CouponStat = {
  couponId: string;
  code: string;
  orderCount: number;
  totalDiscount: number;
  cancelledOrders: number;
};

/** Ambil statistik per-kupon (dihitung dari pesanan). */
export async function fetchCouponStats(): Promise<Record<string, CouponStat>> {
  const data = await adminFetch<{ stats: Record<string, CouponStat> }>(
    "/api/admin/coupons?stats=1",
  );
  return data.stats;
}

/** Payload form kupon (create/update). */
export type CouponFormInput = {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minSpend: number;
  /** Kupon bundel (FASE P3): slug produk yang wajib ada di keranjang. */
  appliesToSlugs?: string[];
  /** Kupon bundel (FASE P3): minimal jumlah item (qty) di keranjang. */
  minItems?: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  limitPerUser?: number;
  active: boolean;
};

export async function createCoupon(input: CouponFormInput): Promise<Coupon> {
  const data = await adminFetch<{ coupon: Coupon }>("/api/admin/coupons", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.coupon;
}

export async function updateCoupon(
  id: string,
  patch: Partial<CouponFormInput>,
): Promise<Coupon> {
  const data = await adminFetch<{ coupon: Coupon }>(
    `/api/admin/coupons?id=${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return data.coupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(
    `/api/admin/coupons?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** Pulihkan kupon yang diarsipkan (`KP-M3`). */
export async function restoreCoupon(id: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(
    `/api/admin/coupons?id=${encodeURIComponent(id)}&restore=1`,
    { method: "DELETE" },
  );
}

/** Quote satu sel CSV. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Label nilai kupon (mis. "10%" atau "Rp50.000"). */
export function couponValueLabel(coupon: Coupon): string {
  return coupon.type === "percent"
    ? `${coupon.value}%`
    : formatRupiah(coupon.value);
}

/** Ekspor daftar kupon ke CSV (opsional menyertakan statistik dampak). */
export function exportCouponsToCsv(
  coupons: Coupon[],
  stats?: Record<string, CouponStat>,
  filename?: string,
) {
  const headers = [
    "Kode",
    "Deskripsi",
    "Jenis",
    "Nilai",
    "Min Belanja",
    "Maks Diskon",
    "Kupon Bundel (slug)",
    "Min Item",
    "Mulai",
    "Berakhir",
    "Kuota",
    "Dipakai",
    "Batas/User",
    "Aktif",
    "Arsip",
    "Jumlah Order",
    "Total Diskon",
    "Order Dibatalkan",
  ];
  const rows = coupons.map((c) => {
    const s = stats?.[c.id] ?? stats?.[`code:${c.code}`];
    return [
      c.code,
      c.description ?? "",
      COUPON_TYPE_LABEL[c.type],
      c.type === "percent" ? `${c.value}%` : c.value,
      c.minSpend,
      c.maxDiscount ?? "",
      (c.appliesToSlugs ?? []).join(" | "),
      c.minItems ?? "",
      c.startsAt ?? "",
      c.endsAt ?? "",
      c.usageLimit ?? "∞",
      c.usageCount,
      c.limitPerUser,
      c.active ? "Ya" : "Tidak",
      c.archived ? "Ya" : "Tidak",
      s?.orderCount ?? 0,
      s?.totalDiscount ?? 0,
      s?.cancelledOrders ?? 0,
    ]
      .map(csvCell)
      .join(",");
  });
  const csv = "\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `kupon-lktech-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
