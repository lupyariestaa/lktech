import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSiteContent } from "@/lib/site-content";
import { defaultSiteContent, isDefaultTestimonials } from "@/lib/content-types";
import { planLegacyImport } from "@/lib/taman-logic";
import { listTamanTestimonials, writeTamanTestimonial } from "@/lib/taman-store";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/taman/import-legacy — impor testimoni lama dari konten situs (T11).
 * - Contoh bawaan (placeholder) tidak pernah diimpor.
 * - Setiap draft `pending` dan `consent.given: false`; admin wajib mencatat persetujuan.
 * - Idempoten: testimoni yang sudah pernah diimpor (berdasarkan `legacyKey`) dilewati.
 * Pratinjau: kirim POST dengan `{ "dryRun": true }` (tanpa menyimpan apa pun).
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = body.dryRun === true;

  const content = await getSiteContent();
  const legacy = isDefaultTestimonials(content.testimonials) ? [] : content.testimonials;
  const placeholders = defaultSiteContent().testimonials;

  const existing = await listTamanTestimonials();
  const existingKeys = existing
    .map((t) => t.legacyKey)
    .filter((k): k is string => typeof k === "string" && k.length > 0);

  const nowISO = new Date().toISOString();
  const plan = planLegacyImport({ legacy, placeholders, existingKeys, nowISO });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      drafts: plan.drafts.length,
      skipped: plan.skipped,
    });
  }

  const ids: string[] = [];
  for (const draft of plan.drafts) {
    const id = await writeTamanTestimonial(
      {
        ...(draft as Record<string, unknown>),
        animal: "kucing",
        order: existing.length + ids.length,
      } as never,
      null,
    );
    ids.push(id);
  }

  await recordAdminAudit({
    action: "taman.import_review",
    actor: check.email,
    target: "legacy",
    meta: { imported: ids.length, skipped: plan.skipped.length, source: "legacy" },
  });

  return NextResponse.json({ ok: true, imported: ids.length, skipped: plan.skipped }, { status: 201 });
}
