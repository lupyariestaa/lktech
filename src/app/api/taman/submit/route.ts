import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { bearerToken } from "@/lib/admin-guard";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { validateSubmit, SUBMIT_LIMITS, hasTooManyPending } from "@/lib/taman-logic";
import { writeTamanTestimonial, TAMAN_COLLECTION } from "@/lib/taman-store";
import { CONSENT_TEXT } from "@/lib/taman-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/taman/submit — kirim testimoni (publik, wajib login Google).
 * - Token diverifikasi server; `email_verified` wajib true.
 * - Testimoni tersimpan `pending`; tidak tampil sebelum admin menerbitkan.
 * - Email & catatan persetujuan hanya di `taman_private` (tidak pernah dikembalikan).
 */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  if (!adminAuth || !db) {
    return NextResponse.json({ error: "Layanan belum dikonfigurasi di server." }, { status: 503 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan masuk ulang." }, { status: 401 });
  }
  if (decoded.email_verified !== true || !decoded.email) {
    return NextResponse.json(
      { error: "Akun Google Anda belum terverifikasi email." },
      { status: 403 },
    );
  }

  // Rate limit: per IP dan per uid (pembatasan ganda).
  const ipLimit = await checkRateLimit(`taman:ip:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const uidLimit = await checkRateLimit(`taman:uid:${decoded.uid}`, SUBMIT_LIMITS.perDayPerUser, 24 * 60 * 60 * 1000);
  if (!ipLimit.ok || !uidLimit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak pengiriman. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(Math.max(ipLimit.retryAfter, uidLimit.retryAfter)) } },
    );
  }

  // Batasi pending aktif per pengguna.
  const pendingSnap = await db
    .collection(TAMAN_COLLECTION)
    .where("ownerUid", "==", decoded.uid)
    .where("status", "==", "pending")
    .get();
  if (hasTooManyPending(pendingSnap.size)) {
    return NextResponse.json(
      { error: "Anda masih punya testimoni yang menunggu tinjauan." },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const nowMs = Date.now();
  const fallbackName = typeof decoded.name === "string" ? decoded.name : decoded.email.split("@")[0];
  const checked = validateSubmit(body, nowMs, fallbackName);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const nowISO = new Date(nowMs).toISOString();
  const id = await writeTamanTestimonial(
    {
      kind: "real",
      status: "pending",
      displayName: checked.value.displayName,
      role: checked.value.role,
      quote: checked.value.quote,
      rating: checked.value.rating,
      dateISO: checked.value.dateISO,
      animal: "kucing", // ditetapkan admin saat menerbitkan (T5)
      order: 0,
      projectSlug: checked.value.projectSlug,
      productSlug: checked.value.productSlug,
      source: "submitted",
      ownerUid: decoded.uid,
      consent: { given: true, givenAtISO: nowISO },
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
    },
    {
      email: decoded.email.toLowerCase(),
      uid: decoded.uid,
      consentText: CONSENT_TEXT,
      consentAtISO: nowISO,
    },
  );

  return NextResponse.json({ ok: true, id, status: "pending" }, { status: 201 });
}
