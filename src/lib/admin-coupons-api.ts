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

/** Payload form kupon (create/update). */
export type CouponFormInput = {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minSpend: number;
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

/** Ekspor daftar kupon ke CSV. */
export function exportCouponsToCsv(coupons: Coupon[], filename?: string) {
  const headers = [
    "Kode",
    "Deskripsi",
    "Jenis",
    "Nilai",
    "Min Belanja",
    "Maks Diskon",
    "Mulai",
    "Berakhir",
    "Kuota",
    "Dipakai",
    "Batas/User",
    "Aktif",
  ];
  const rows = coupons.map((c) =>
    [
      c.code,
      c.description ?? "",
      COUPON_TYPE_LABEL[c.type],
      c.type === "percent" ? `${c.value}%` : c.value,
      c.minSpend,
      c.maxDiscount ?? "",
      c.startsAt ?? "",
      c.endsAt ?? "",
      c.usageLimit ?? "∞",
      c.usageCount,
      c.limitPerUser,
      c.active ? "Ya" : "Tidak",
    ]
      .map(csvCell)
      .join(","),
  );
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
