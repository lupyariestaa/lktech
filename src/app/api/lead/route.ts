import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/lead-schema";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendLeadNotification } from "@/lib/email";
import { waLink } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const lead = parsed.data;
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
