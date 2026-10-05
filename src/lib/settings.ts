import {
  DEFAULT_SETTINGS,
  type SiteSettings,
  type SocialLink,
} from "@/lib/settings-types";
import { normalizePhone } from "@/lib/whatsapp";

/** ID dokumen pengaturan di Firestore. */
export const SETTINGS_DOC_ID = "site";

/** Menggabungkan pengaturan dari Firestore dengan nilai default. */
export function mergeSettings(data: Partial<SiteSettings> | undefined): SiteSettings {
  return {
    email: data?.email?.trim() || DEFAULT_SETTINGS.email,
    // Normalisasi nomor lokal (08…) → internasional (628…).
    whatsapp: normalizePhone(data?.whatsapp) || DEFAULT_SETTINGS.whatsapp,
    location: data?.location?.trim() || DEFAULT_SETTINGS.location,
    socials: Array.isArray(data?.socials)
      ? data!.socials.filter(
          (s): s is SocialLink =>
            Boolean(s && typeof s.href === "string" && s.href.trim() && typeof s.label === "string"),
        )
      : DEFAULT_SETTINGS.socials,
    // Default aktif bila belum pernah di-set (undefined → true).
    notifyBuyerOnOrder:
      typeof data?.notifyBuyerOnOrder === "boolean"
        ? data.notifyBuyerOnOrder
        : DEFAULT_SETTINGS.notifyBuyerOnOrder,
    notifyBuyerOnStatus:
      typeof data?.notifyBuyerOnStatus === "boolean"
        ? data.notifyBuyerOnStatus
        : DEFAULT_SETTINGS.notifyBuyerOnStatus,
    notifyCartReminders:
      typeof data?.notifyCartReminders === "boolean"
        ? data.notifyCartReminders
        : DEFAULT_SETTINGS.notifyCartReminders,
  };
}

/**
 * Mengambil pengaturan situs dari Firestore (server-side).
 * Fallback ke nilai default bila belum ada / Admin SDK tidak tersedia.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    if (!db) return DEFAULT_SETTINGS;

    const snap = await db
      .collection("settings")
      .doc(SETTINGS_DOC_ID)
      .get();

    if (!snap.exists) return DEFAULT_SETTINGS;
    return mergeSettings(snap.data() as Partial<SiteSettings>);
  } catch (err) {
    console.error("[settings] gagal memuat:", err);
    return DEFAULT_SETTINGS;
  }
}
