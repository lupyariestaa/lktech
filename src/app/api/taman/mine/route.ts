import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { bearerToken } from "@/lib/admin-guard";
import { TAMAN_COLLECTION } from "@/lib/taman-store";
import { normalizeTamanTestimonial, toMineView } from "@/lib/taman-logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/taman/mine — testimoni milik pengguna yang login (tab "Testimoni saya").
 * Hanya field yang relevan bagi pemiliknya: status dan tanggal. Email tidak ikut.
 */
export async function GET(req: Request) {
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

  const snap = await db.collection(TAMAN_COLLECTION).where("ownerUid", "==", uid).get();
  const items = snap.docs
    .map((d) => toMineView(normalizeTamanTestimonial(d.id, d.data())))
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
