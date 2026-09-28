import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { waLink } from "@/lib/whatsapp";
import type { LeadInput, LeadRecord } from "@/lib/lead-schema";

export type SubmitResult =
  | { status: "saved"; id: string }
  | { status: "fallback"; whatsappUrl: string };

/**
 * Menyusun pesan WhatsApp dari data lead.
 */
export function buildWhatsAppMessage(lead: LeadInput) {
  return [
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
}

export function buildFallbackWhatsApp(lead: LeadInput) {
  return waLink(buildWhatsAppMessage(lead));
}

/**
 * Mengirim lead kontak.
 * - Bila Firebase dikonfigurasi: simpan ke koleksi `leads` Firestore.
 * - Bila tidak dikonfigurasi atau gagal: kembalikan URL WhatsApp sebagai fallback
 *   agar lead tetap bisa masuk ke tim (tidak ada data yang hilang).
 */
export async function submitLead(lead: LeadInput): Promise<SubmitResult> {
  if (!isFirebaseConfigured) {
    return { status: "fallback", whatsappUrl: buildFallbackWhatsApp(lead) };
  }

  const db = getDb();
  if (!db) {
    return { status: "fallback", whatsappUrl: buildFallbackWhatsApp(lead) };
  }

  try {
    const record: LeadRecord = {
      ...lead,
      createdAt: new Date().toISOString(),
      source: "website-contact-form",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    // `serverTimestamp` untuk ordering andal di sisi server Firestore.
    const payload = {
      ...record,
      status: "baru",
      createdAt: serverTimestamp(),
      createdAtISO: record.createdAt,
    };

    const ref = await addDoc(collection(db, "leads"), payload);
    return { status: "saved", id: ref.id };
  } catch (err) {
    console.error("[leads] gagal menyimpan ke Firestore:", err);
    return { status: "fallback", whatsappUrl: buildFallbackWhatsApp(lead) };
  }
}
