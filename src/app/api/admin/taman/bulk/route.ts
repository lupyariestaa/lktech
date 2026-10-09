import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getTamanTestimonial,
  getTamanPrivate,
  deleteTamanTestimonial,
  updateTamanTestimonial,
} from "@/lib/taman-store";
import {
  canPublish,
  statusForAction,
  TAMAN_BULK_ACTIONS,
  TAMAN_BULK_MAX,
  type TamanBulkAction,
} from "@/lib/taman-logic";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  action: z.enum(TAMAN_BULK_ACTIONS),
  ids: z.array(z.string().trim().min(1).max(200)).min(1).max(TAMAN_BULK_MAX),
});

/**
 * POST /api/admin/taman/bulk — publish | hide | delete untuk banyak testimoni (maks 50).
 * Setiap item diproses sendiri: gagal satu item tidak membatalkan item lain.
 * Publish `real` tetap melewati gate persetujuan + bukti (tidak bisa dilewati bulk).
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
  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }
  const { action, ids } = parsed.data as { action: TamanBulkAction; ids: string[] };
  const unique = Array.from(new Set(ids));

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of unique) {
    try {
      const item = await getTamanTestimonial(id);
      if (!item) {
        results.push({ id, ok: false, error: "Tidak ditemukan." });
        continue;
      }
      if (action === "delete") {
        await deleteTamanTestimonial(id);
      } else {
        const status = statusForAction(action);
        if (!status) {
          results.push({ id, ok: false, error: "Aksi tidak dikenal." });
          continue;
        }
        if (status === "published") {
          const priv = await getTamanPrivate(id);
          const gate = canPublish({ kind: item.kind, consent: item.consent }, priv?.evidenceNote);
          if (!gate.ok) {
            results.push({ id, ok: false, error: gate.reason });
            continue;
          }
          await updateTamanTestimonial(id, {
            status,
            approvedAtISO: new Date().toISOString(),
            approvedBy: check.email,
          });
        } else {
          await updateTamanTestimonial(id, { status });
        }
      }
      await recordAdminAudit({
        action: "taman.bulk",
        actor: check.email,
        target: id,
        meta: { bulk: action },
      });
      results.push({ id, ok: true });
    } catch (err) {
      console.error("[api/admin/taman/bulk] gagal:", id, err);
      results.push({ id, ok: false, error: "Gagal memproses." });
    }
  }

  // Revalidate beranda (seksi testimoni dan JSON-LD) bila ada perubahan publik.
  if (results.some((r) => r.ok)) revalidatePath("/");

  const done = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, action, done, failed: results.length - done, results });
}
