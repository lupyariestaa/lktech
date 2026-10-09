import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { bearerToken } from "@/lib/admin-guard";
import { deleteTamanTestimonial, getTamanTestimonial } from "@/lib/taman-store";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/taman/mine/[id] — pemberi menghapus testimoninya sendiri (hak hapus, Q20).
 * Menghapus dokumen publik dan data privat (email ikut hilang). Pemilik dicek dari token,
 * bukan dari body. Audit mencatat id & waktu saja.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  if (!adminAuth || !db) {
    return NextResponse.json({ error: "Layanan belum dikonfigurasi di server." }, { status: 503 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid;
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan masuk ulang." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const item = await getTamanTestimonial(id);
  if (!item) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });
  // Bukan milik pengguna ini → jawab seolah tidak ada (tidak membocorkan keberadaan).
  if (item.ownerUid !== uid) {
    return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });
  }

  await deleteTamanTestimonial(id);
  await recordAdminAudit({
    action: "taman.delete",
    actor: `owner:${uid}`,
    target: id,
    meta: { by: "owner" },
  });
  return NextResponse.json({ ok: true });
}
