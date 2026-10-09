import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { getReviewById } from "@/lib/reviews";
import { writeTamanTestimonial, listTamanTestimonials } from "@/lib/taman-store";
import { draftFromReview, nextAnimal } from "@/lib/taman-logic";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ reviewId: z.string().trim().min(1).max(200) });

/**
 * POST /api/admin/taman/import-review — angkat ulasan produk jadi draft testimoni (Q12).
 * - Hasil SELALU `pending` dan persetujuan belum tercatat: admin wajib mengisi bukti
 *   sebelum bisa menerbitkan. Tidak ada publikasi otomatis.
 * - Satu ulasan hanya bisa diangkat sekali (cek `sourceRefId`).
 * - `uid` pembeli disimpan sebagai pemilik (hak hapus), tidak pernah ke dokumen publik.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "reviewId wajib diisi." }, { status: 400 });

  const review = await getReviewById(parsed.data.reviewId);
  if (!review) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
  if (review.status !== "approved") {
    return NextResponse.json({ error: "Hanya ulasan yang sudah disetujui yang bisa diangkat." }, { status: 409 });
  }
  if (review.rating < 4) {
    return NextResponse.json({ error: "Hanya ulasan berbintang 4 ke atas yang bisa diangkat." }, { status: 409 });
  }

  const existing = await listTamanTestimonials();
  if (existing.some((t) => t.sourceRefId === review.id)) {
    return NextResponse.json({ error: "Ulasan ini sudah pernah diangkat." }, { status: 409 });
  }

  const nowISO = new Date().toISOString();
  const { publicDoc } = draftFromReview(review, nowISO);
  const animal = nextAnimal(existing.map((t) => t.animal));
  const id = await writeTamanTestimonial(
    {
      ...(publicDoc as Record<string, unknown>),
      animal,
      order: existing.length,
    } as never,
    null,
  );

  await recordAdminAudit({
    action: "taman.import_review",
    actor: check.email,
    target: id,
    meta: { reviewId: review.id, rating: review.rating },
  });
  return NextResponse.json({ ok: true, id, status: "pending" }, { status: 201 });
}
