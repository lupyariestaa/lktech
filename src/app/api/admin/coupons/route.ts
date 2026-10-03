import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  createCoupon,
  deleteCoupon,
  getCouponsSummary,
  isCouponCodeTaken,
  listCoupons,
  normalizeCouponCode,
  updateCoupon,
  type CouponInput,
} from "@/lib/coupons";
import { couponCreateSchema, couponUpdateSchema } from "@/lib/api-schemas";
import { COUPON_TYPES } from "@/lib/coupon-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/coupons — daftar kupon.
 * GET /api/admin/coupons?summary=1 — ringkasan statistik.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const url = new URL(req.url);
  try {
    if (url.searchParams.get("summary") === "1") {
      const summary = await getCouponsSummary();
      return NextResponse.json({ summary }, { headers: { "Cache-Control": "no-store" } });
    }
    const coupons = await listCoupons();
    return NextResponse.json({ coupons }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/admin/coupons] GET gagal:", err);
    return NextResponse.json({ error: "Gagal mengambil kupon." }, { status: 500 });
  }
}

/** Validasi & normalisasi input kupon menjadi `CouponInput`. */
function toInput(
  data: {
    code: string;
    description?: string;
    type: string;
    value: number;
    minSpend: number;
    maxDiscount?: number;
    startsAt?: string;
    endsAt?: string;
    usageLimit?: number;
    limitPerUser?: number;
    active: boolean;
  },
): CouponInput {
  const type = (COUPON_TYPES as readonly string[]).includes(data.type)
    ? (data.type as CouponInput["type"])
    : "percent";
  return {
    code: normalizeCouponCode(data.code),
    description: data.description,
    type,
    value: data.type === "percent" ? Math.min(100, Math.max(0, data.value)) : Math.max(0, data.value),
    minSpend: Math.max(0, data.minSpend),
    maxDiscount:
      type === "percent" && typeof data.maxDiscount === "number" && data.maxDiscount > 0
        ? data.maxDiscount
        : undefined,
    startsAt: data.startsAt || undefined,
    endsAt: data.endsAt || undefined,
    usageLimit:
      typeof data.usageLimit === "number" && data.usageLimit > 0
        ? Math.floor(data.usageLimit)
        : undefined,
    limitPerUser:
      typeof data.limitPerUser === "number" && data.limitPerUser > 0
        ? Math.floor(data.limitPerUser)
        : 1,
    active: data.active !== false,
  };
}

/** POST /api/admin/coupons — buat kupon baru. */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = couponCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data kupon tidak valid." },
      { status: 400 },
    );
  }

  const code = normalizeCouponCode(parsed.data.code);
  if (!code) {
    return NextResponse.json({ error: "Kode kupon tidak valid." }, { status: 400 });
  }

  try {
    if (await isCouponCodeTaken(code)) {
      return NextResponse.json(
        { error: `Kode "${code}" sudah dipakai kupon lain.` },
        { status: 409 },
      );
    }
    const coupon = await createCoupon(toInput(parsed.data), check.email);
    return NextResponse.json({ ok: true, coupon });
  } catch (err) {
    console.error("[api/admin/coupons] POST gagal:", err);
    return NextResponse.json({ error: "Gagal menyimpan kupon." }, { status: 500 });
  }
}

/** PATCH /api/admin/coupons?id= — perbarui kupon (partial). */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = couponUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data kupon tidak valid." },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.code !== undefined) {
      const code = normalizeCouponCode(parsed.data.code);
      if (!code) {
        return NextResponse.json({ error: "Kode kupon tidak valid." }, { status: 400 });
      }
      if (await isCouponCodeTaken(code, id)) {
        return NextResponse.json(
          { error: `Kode "${code}" sudah dipakai kupon lain.` },
          { status: 409 },
        );
      }
    }
    const coupon = await updateCoupon(id, parsed.data as Partial<CouponInput>);
    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, coupon });
  } catch (err) {
    console.error("[api/admin/coupons] PATCH gagal:", err);
    return NextResponse.json({ error: "Gagal memperbarui kupon." }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons?id= — hapus kupon. */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const ok = await deleteCoupon(id);
    if (!ok) {
      return NextResponse.json({ error: "Kupon tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/coupons] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus kupon." }, { status: 500 });
  }
}
