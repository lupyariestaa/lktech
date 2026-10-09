import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteTamanTestimonial,
  getTamanPrivate,
  getTamanTestimonial,
  updateTamanEvidence,
  updateTamanTestimonial,
} from "@/lib/taman-store";
import { isAnimalKey } from "@/lib/taman-types";
import {
  canPublish,
  sanitizeOrder,
  sanitizeRating,
  shortName,
  validateQuote,
  isValidPastDate,
  TAMAN_LIMITS,
} from "@/lib/taman-logic";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  fullName: z.string().trim().max(120).optional(),
  role: z.string().trim().max(TAMAN_LIMITS.roleMax).optional(),
  quote: z.string().max(2000).optional(),
  rating: z.number().optional(),
  dateISO: z.string().trim().max(40).optional(),
  animal: z.string().optional(),
  order: z.number().optional(),
  projectSlug: z.string().trim().max(200).optional(),
  productSlug: z.string().trim().max(200).optional(),
  /** Status tujuan (pending/published/hidden/rejected). */
  status: z.enum(["pending", "published", "hidden", "rejected"]).optional(),
  /** Catatan bukti persetujuan dari admin (wajib untuk publish real). */
  evidenceNote: z.string().trim().max(500).optional(),
  /** Admin mencatat bahwa persetujuan pemberi sudah diterima. */
  consentGiven: z.boolean().optional(),
});

/** PATCH /api/admin/taman/[id] — ubah isi, hewan, urutan, status (dengan gate publish). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const { id } = await ctx.params;
  const current = await getTamanTestimonial(id);
  if (!current) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }
  const body = parsed.data;
  const patch: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    const name = shortName(body.displayName, TAMAN_LIMITS.displayNameMax);
    if (!name) return NextResponse.json({ error: "Nama tampil wajib diisi." }, { status: 400 });
    patch.displayName = name;
  }
  if (body.fullName !== undefined) patch.fullName = body.fullName || undefined;
  if (body.role !== undefined) {
    if (!body.role) return NextResponse.json({ error: "Peran wajib diisi." }, { status: 400 });
    patch.role = body.role;
  }
  if (body.quote !== undefined) {
    const q = validateQuote(body.quote, TAMAN_LIMITS.quoteMin, TAMAN_LIMITS.quoteMax);
    if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 400 });
    patch.quote = q.value;
  }
  if (body.rating !== undefined) {
    const r = sanitizeRating(body.rating);
    if (r === null) return NextResponse.json({ error: "Rating harus 1 sampai 5." }, { status: 400 });
    patch.rating = r;
  }
  if (body.dateISO !== undefined) {
    if (!isValidPastDate(body.dateISO, Date.now())) {
      return NextResponse.json({ error: "Tanggal tidak valid atau di masa depan." }, { status: 400 });
    }
    patch.dateISO = body.dateISO;
  }
  if (body.animal !== undefined) {
    if (!isAnimalKey(body.animal)) return NextResponse.json({ error: "Hewan tidak dikenal." }, { status: 400 });
    patch.animal = body.animal;
  }
  if (body.order !== undefined) {
    const o = sanitizeOrder(body.order);
    if (o === null) return NextResponse.json({ error: "Urutan tidak valid." }, { status: 400 });
    patch.order = o;
  }
  if (body.projectSlug !== undefined) patch.projectSlug = body.projectSlug || undefined;
  if (body.productSlug !== undefined) patch.productSlug = body.productSlug || undefined;

  // Catatan bukti & persetujuan (disimpan di data privat, bukan dokumen publik).
  const priv = await getTamanPrivate(id);
  const evidenceNote = body.evidenceNote ?? priv?.evidenceNote;
  if (body.evidenceNote !== undefined) {
    await updateTamanEvidence(id, body.evidenceNote, check.email);
  }
  if (body.consentGiven === true && !current.consent.given) {
    patch.consent = { given: true, givenAtISO: new Date().toISOString() };
  }
  const consentGiven = body.consentGiven === true || current.consent.given;

  // Perubahan status (gate publish di server).
  let action: "taman.save" | "taman.publish" | "taman.hide" | "taman.reject" = "taman.save";
  if (body.status !== undefined && body.status !== current.status) {
    if (body.status === "published") {
      const gate = canPublish({ kind: current.kind, consent: { given: consentGiven } }, evidenceNote);
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 409 });
      action = "taman.publish";
      patch.approvedAtISO = new Date().toISOString();
      patch.approvedBy = check.email;
    } else if (body.status === "hidden") {
      action = "taman.hide";
    } else if (body.status === "rejected") {
      action = "taman.reject";
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }
  patch.updatedAtISO = new Date().toISOString();

  await updateTamanTestimonial(id, patch as Parameters<typeof updateTamanTestimonial>[1]);
  await recordAdminAudit({
    action,
    actor: check.email,
    target: id,
    meta: { fields: Object.keys(patch).filter((k) => !["updatedAtISO"].includes(k)) },
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/taman/[id] — hapus testimoni dan data privatnya (Q20). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const { id } = await ctx.params;
  const current = await getTamanTestimonial(id);
  if (!current) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });

  await deleteTamanTestimonial(id);
  await recordAdminAudit({
    action: "taman.delete",
    actor: check.email,
    target: id,
    meta: { kind: current.kind, source: current.source },
  });
  return NextResponse.json({ ok: true });
}
