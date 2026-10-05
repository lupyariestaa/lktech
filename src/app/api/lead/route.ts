import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/lead-schema";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendLeadNotification } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { computeLeadScore } from "@/lib/lead-scoring-pure";
import { waLink } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas pengiriman form per IP dalam satu jendela waktu. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 menit

function fallbackWhatsApp(lead: {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}) {
  const text = [
    "Halo LKTech! Saya ingin berkonsultasi.",
    "",
    `Nama: ${lead.name}`,
    `Email: ${lead.email}`,
    `Telepon: ${lead.phone}`,
    `Layanan: ${lead.service}`,
    "",
    "Pesan:",
    lead.message,
  ].join("\n");
  return waLink(text);
}

/**
 * POST /api/lead — menerima form kontak.
 * 1. Validasi (Zod).
 * 2. Simpan ke Firestore (Admin SDK).
 * 3. Kirim notifikasi email (best-effort).
 * 4. Fallback WhatsApp bila penyimpanan gagal.
 */
export async function POST(req: Request) {
  // Anti-spam: batasi jumlah kiriman per IP.
  const ip = clientIp(req);
  const rl = rateLimit(`lead:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          "Terlalu banyak pengiriman. Silakan coba lagi beberapa saat lagi atau hubungi kami via WhatsApp.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data form tidak valid." },
      { status: 400 },
    );
  }

  const { website, ...lead } = parsed.data;

  // Honeypot terisi → kemungkinan besar bot. Balas "sukses" palsu tanpa
  // menyimpan/mengirim apa pun supaya bot tidak mencoba lagi.
  if (website && website.trim() !== "") {
    return NextResponse.json({ status: "saved", id: "ignored", emailed: false });
  }

  const db = getAdminDb();

  // Bila Admin SDK tidak tersedia, arahkan ke WhatsApp agar lead tak hilang.
  if (!db) {
    return NextResponse.json(
      { status: "fallback", whatsappUrl: fallbackWhatsApp(lead) },
      { status: 200 },
    );
  }

  try {
    const now = new Date().toISOString();
    const ref = await db.collection("leads").add({
      ...lead,
      status: "baru",
      stage: "baru",
      score: computeLeadScore({ ...lead, stage: "baru" }),
      source: "website-contact-form",
      userAgent: req.headers.get("user-agent") ?? undefined,
      createdAtISO: now,
    });

    // Kirim notifikasi email (tidak menggagalkan proses bila error).
    const email = await sendLeadNotification(lead);

    return NextResponse.json({
      status: "saved",
      id: ref.id,
      emailed: email.ok,
    });
  } catch (err) {
    console.error("[api/lead] gagal menyimpan:", err);
    return NextResponse.json(
      { status: "fallback", whatsappUrl: fallbackWhatsApp(lead) },
      { status: 200 },
    );
  }
}
