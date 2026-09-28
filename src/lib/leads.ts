import { waLink } from "@/lib/whatsapp";
import type { LeadInput } from "@/lib/lead-schema";

export type SubmitResult =
  | { status: "saved"; id: string; emailed: boolean }
  | { status: "fallback"; whatsappUrl: string };

/**
 * Menyusun pesan WhatsApp dari data lead (untuk fallback).
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
 * Mengirim lead kontak melalui API server.
 * Server menyimpan ke Firestore + mengirim notifikasi email.
 * Bila server mengembalikan fallback, arahkan pengguna ke WhatsApp.
 */
export async function submitLead(lead: LeadInput): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });

    if (!res.ok) {
      return { status: "fallback", whatsappUrl: buildFallbackWhatsApp(lead) };
    }

    const data = await res.json();

    if (data?.status === "saved" && data.id) {
      return { status: "saved", id: data.id, emailed: Boolean(data.emailed) };
    }

    if (data?.whatsappUrl) {
      return { status: "fallback", whatsappUrl: data.whatsappUrl };
    }

    return { status: "fallback", whatsappUrl: buildFallbackWhatsApp(lead) };
  } catch (err) {
    console.error("[leads] gagal mengirim:", err);
    return { status: "fallback", whatsappUrl: buildFallbackWhatsApp(lead) };
  }
}
