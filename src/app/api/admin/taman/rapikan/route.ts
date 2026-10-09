import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { listTamanTestimonials, updateTamanTestimonial } from "@/lib/taman-store";
import { nextAnimal } from "@/lib/taman-logic";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/taman/rapikan — bagi hewan secara merata dan atur urutan
 * untuk testimoni yang sudah TERBIT. Dipakai sekali untuk merapikan data yang
 * sudah ada (mis. semua masih "kucing" dan order 0 karena terbit lewat bulk awal).
 * Testimoni `pending`/`hidden` tidak diubah. Hanya admin.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const all = await listTamanTestimonials();
  const published = all
    .filter((t) => t.kind === "real" && t.status === "published")
    .sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));

  const used: string[] = [];
  let changed = 0;
  for (const [i, t] of published.entries()) {
    const animal = nextAnimal(used);
    used.push(animal);
    // Hanya tulis bila benar-benar berubah (hindari tulisan tak perlu).
    if (t.animal !== animal || t.order !== i) {
      await updateTamanTestimonial(t.id, { animal, order: i });
      changed += 1;
    }
  }

  revalidatePath("/");
  await recordAdminAudit({
    action: "taman.reorder",
    actor: check.email,
    target: "rapikan",
    meta: { published: published.length, changed },
  });

  return NextResponse.json({ ok: true, published: published.length, changed });
}
