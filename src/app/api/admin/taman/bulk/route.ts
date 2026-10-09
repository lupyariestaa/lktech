import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getTamanTestimonial,
  getTamanPrivate,
  listTamanTestimonials,
  deleteTamanTestimonial,
  updateTamanTestimonial,
  updateTamanEvidence,
} from "@/lib/taman-store";
import {
  canPublish,
  nextAnimal,
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
  /** Untuk `consent_publish`: catatan bukti persetujuan yang dicatat admin. */
  evidenceNote: z.string().trim().min(3).max(500).optional(),
});

/**
 * POST /api/admin/taman/bulk — publish | hide | delete untuk banyak testimoni (maks 50).
 * Setiap item diproses sendiri: gagal satu item tidak membatalkan item lain.
 * Publish `real` tetap melewati gate persetujuan + bukti. Khusus `consent_publish`, admin\n * menyatakan persetujuan sudah diterima untuk item terpilih, lalu dicatat buktinya.
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
  const { action, ids, evidenceNote } = parsed.data as {
    action: TamanBulkAction;
    ids: string[];
    evidenceNote?: string;
  };
  const unique = Array.from(new Set(ids));
  if (action === "consent_publish" && !evidenceNote) {
    return NextResponse.json({ error: "Catatan bukti persetujuan wajib diisi." }, { status: 400 });
  }

  // Daftar hewan yang sudah dipakai (testimoni terbit) untuk membagi hewan secara merata.
  const usedAnimals = (await listTamanTestimonials())
    .filter((t) => t.status === "published")
    .map((t) => t.animal);

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
      } else if (action === "consent_publish") {
        // Tandai persetujuan + catat bukti, lalu terbitkan (gate dievaluasi dengan nilai tersimpan).
        // Admin menyatakan persetujuan sudah diterima; setelah baris berikut, nilainya true.
        if (!item.consent.given) {
          await updateTamanTestimonial(id, { consent: { given: true, givenAtISO: new Date().toISOString() } });
        }
        await updateTamanEvidence(id, evidenceNote as string, check.email);
        const gate = canPublish({ kind: item.kind, consent: { given: true } }, evidenceNote);
        if (!gate.ok) {
          results.push({ id, ok: false, error: gate.reason });
          continue;
        }
        // Hewan beragam: pakai hewan yang paling sedikit dipakai, lalu catat sebagai terpakai.
        const animal = nextAnimal(usedAnimals);
        usedAnimals.push(animal);
        await updateTamanTestimonial(id, {
          status: "published",
          animal,
          approvedAtISO: new Date().toISOString(),
          approvedBy: check.email,
        });
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
