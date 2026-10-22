import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import {
  createCoupon,
  createCouponBatch,
  deleteCoupon,
  duplicateCoupon,
  getCouponsSummary,
  getCouponStats,
  getCampaignAnalytics,
  isCouponCodeTaken,
  listCoupons,
  normalizeCouponCode,
  restoreCoupon,
  updateCoupon,
  type CouponInput,
} from "@/lib/coupons";
import { generateBatchCodes } from "@/lib/coupon-pure";
import { couponCreateSchema, couponUpdateSchema } from "@/lib/api-schemas";
import { COUPON_TYPES } from "@/lib/coupon-types";
import { recordAdminAudit } from "@/lib/admin-audit";
import { guardAdminMutation } from "@/lib/admin-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Segarkan data promo publik setelah mutasi kupon: buang cache DATA
 * (`CACHE_TAGS.promos`) + revalidate halaman `/promo`.
 */
function revalidatePromos(): void {
  revalidateTag(CACHE_TAGS.promos, REVALIDATE_NOW);
  revalidatePath("/promo");
}

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
    if (url.searchParams.get("stats") === "1") {
      const stats = await getCouponStats();
      return NextResponse.json({ stats }, { headers: { "Cache-Control": "no-store" } });
    }
    // Analitik per kampanye (C8/K5).
    if (url.searchParams.get("campaigns") === "1") {
      const days = Number(url.searchParams.get("days")) || 30;
      const campaigns = await getCampaignAnalytics(days);
      return NextResponse.json({ campaigns }, { headers: { "Cache-Control": "no-store" } });
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
    tiers?: { minSpend: number; value: number; kind?: "percent" | "amount"; maxDiscount?: number }[];
    minSpend: number;
    appliesToSlugs?: string[];
    minItems?: number;
    maxDiscount?: number;
    startsAt?: string;
    endsAt?: string;
    usageLimit?: number;
    limitPerUser?: number;
    singleUse?: boolean;
    assignedEmail?: string;
    assignedUid?: string;
    audience?: "semua" | "baru" | "lama";
    perDayLimit?: number;
    campaign?: string;
    stackable?: boolean;
    active: boolean;
  },
): CouponInput {
  const type = (COUPON_TYPES as readonly string[]).includes(data.type)
    ? (data.type as CouponInput["type"])
    : "percent";
  // Kupon bundel (FASE P3): bersihkan slug kosong/duplikat.
  const appliesToSlugs = Array.isArray(data.appliesToSlugs)
    ? Array.from(
        new Set(data.appliesToSlugs.map((s) => s.trim()).filter(Boolean)),
      )
    : [];
  // Tier (C1): bersihkan, urut menaik `minSpend`, ambil maks 20.
  const tiers =
    type === "tiered" && Array.isArray(data.tiers)
      ? data.tiers
          .filter((t) => t && t.value > 0 && t.minSpend >= 0)
          .sort((a, b) => a.minSpend - b.minSpend)
          .slice(0, 20)
      : undefined;
  return {
    code: normalizeCouponCode(data.code),
    description: data.description,
    type,
    value:
      type === "percent"
        ? Math.min(100, Math.max(0, data.value))
        : Math.max(0, data.value),
    tiers: tiers && tiers.length ? tiers : undefined,
    minSpend: Math.max(0, data.minSpend),
    appliesToSlugs: appliesToSlugs.length ? appliesToSlugs : undefined,
    minItems:
      typeof data.minItems === "number" && data.minItems > 0
        ? Math.floor(data.minItems)
        : undefined,
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
      typeof data.limitPerUser === "number" && data.limitPerUser >= 0
        ? Math.floor(data.limitPerUser)
        : 1,
    singleUse: data.singleUse === true ? true : undefined,
    assignedEmail: data.assignedEmail?.trim().toLowerCase() || undefined,
    assignedUid: data.assignedUid?.trim() || undefined,
    audience: data.audience && data.audience !== "semua" ? data.audience : undefined,
    perDayLimit:
      typeof data.perDayLimit === "number" && data.perDayLimit > 0
        ? Math.floor(data.perDayLimit)
        : undefined,
    campaign: data.campaign?.trim() || undefined,
    stackable: data.stackable === true ? true : undefined,
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

  // ===== Aksi: generate massal (C4/K4) =====
  const action = (body as { action?: string } | null)?.action;
  if (action === "batch") {
    const b = body as {
      count?: number;
      prefix?: string;
      suffixLen?: number;
      settings?: Record<string, unknown>;
    };
    const gen = generateBatchCodes(
      typeof b.prefix === "string" ? b.prefix : "",
      typeof b.count === "number" ? b.count : 0,
      typeof b.suffixLen === "number" ? b.suffixLen : 6,
    );
    if (!gen.ok) {
      return NextResponse.json({ error: gen.error }, { status: 400 });
    }
    // Validasi pengaturan bersama (kode diisi per-batch).
    const parsedSettings = couponCreateSchema.safeParse({
      ...(b.settings ?? {}),
      code: "TEMPCODE",
    });
    if (!parsedSettings.success) {
      return NextResponse.json(
        { error: parsedSettings.error.issues[0]?.message ?? "Pengaturan tidak valid." },
        { status: 400 },
      );
    }
    try {
      const baseInput = toInput(parsedSettings.data);
      const { code: _omit, ...baseWithoutCode } = baseInput;
      void _omit;
      const result = await createCouponBatch(baseWithoutCode, gen.codes, check.email);
      await recordAdminAudit({
        action: "coupon.save",
        actor: check.email,
        target: `batch:${gen.codes.length}`,
        meta: { created: result.created.length, failed: result.failed.length },
      });
      revalidatePromos();
      return NextResponse.json({
        ok: true,
        created: result.created,
        failed: result.failed,
      });
    } catch (err) {
      console.error("[api/admin/coupons] batch gagal:", err);
      return NextResponse.json({ error: "Gagal membuat kupon massal." }, { status: 500 });
    }
  }

  // ===== Aksi: duplikat kupon (C4/O15) =====
  if (action === "duplicate") {
    const sourceId = (body as { id?: string } | null)?.id;
    if (!sourceId) {
      return NextResponse.json({ error: "id sumber wajib diisi." }, { status: 400 });
    }
    try {
      const coupon = await duplicateCoupon(sourceId, check.email);
      if (!coupon) {
        return NextResponse.json({ error: "Kupon sumber tidak ditemukan." }, { status: 404 });
      }
      await recordAdminAudit({
        action: "coupon.save",
        actor: check.email,
        target: coupon.code,
        meta: { duplicatedFrom: sourceId },
      });
      revalidatePromos();
      return NextResponse.json({ ok: true, coupon });
    } catch (err) {
      console.error("[api/admin/coupons] duplicate gagal:", err);
      return NextResponse.json({ error: "Gagal menduplikat kupon." }, { status: 500 });
    }
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
    await recordAdminAudit({
      action: "coupon.save",
      actor: check.email,
      target: coupon.code,
      meta: { created: true },
    });
    revalidatePromos();
    return NextResponse.json({ ok: true, coupon });
  } catch (err) {
    // `KP-H2`: klaim kode atomik bisa gagal karena race → laporkan sebagai 409.
    const msg = err instanceof Error ? err.message : "";
    if (/sudah dipakai/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
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
    await recordAdminAudit({
      action: "coupon.save",
      actor: check.email,
      target: coupon.code,
      meta: { created: false },
    });
    revalidatePromos();
    return NextResponse.json({ ok: true, coupon });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/sudah dipakai/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("[api/admin/coupons] PATCH gagal:", err);
    return NextResponse.json({ error: "Gagal memperbarui kupon." }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons?id= — arsipkan kupon (soft-delete, `KP-M3`). */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const limited = await guardAdminMutation(check.uid, "coupon.delete", {
    limit: 20,
  });
  if (limited) return limited;

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    // `?restore=1` memulihkan kupon yang diarsipkan.
    if (url.searchParams.get("restore") === "1") {
      const okRestore = await restoreCoupon(id);
      if (!okRestore) {
        return NextResponse.json({ error: "Kupon tidak ditemukan." }, { status: 404 });
      }
      await recordAdminAudit({
        action: "coupon.restore",
        actor: check.email,
        target: id,
      });
      revalidatePromos();
      return NextResponse.json({ ok: true, restored: true });
    }

    const ok = await deleteCoupon(id);
    if (!ok) {
      return NextResponse.json({ error: "Kupon tidak ditemukan." }, { status: 404 });
    }
    await recordAdminAudit({
      action: "coupon.delete",
      actor: check.email,
      target: id,
    });
    revalidatePromos();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/coupons] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus kupon." }, { status: 500 });
  }
}
