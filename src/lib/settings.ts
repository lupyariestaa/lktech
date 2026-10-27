import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  DEFAULT_SETTINGS,
  type SiteSettings,
  type SocialLink,
} from "@/lib/settings-types";
import { normalizePhone } from "@/lib/whatsapp";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { readVersion } from "@/lib/optimistic-lock-pure";
import { writeVersioned } from "@/lib/optimistic-lock";

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
    brandName: data?.brandName?.trim() || DEFAULT_SETTINGS.brandName,
    tagline: data?.tagline?.trim() || DEFAULT_SETTINGS.tagline,
    seo: data?.seo && typeof data.seo === "object" ? data.seo : DEFAULT_SETTINGS.seo,
    maintenance:
      data?.maintenance && typeof data.maintenance === "object"
        ? {
            enabled: data.maintenance.enabled === true,
            title: data.maintenance.title?.trim() || DEFAULT_SETTINGS.maintenance?.title,
            message: data.maintenance.message?.trim() || "",
            imageUrl: data.maintenance.imageUrl?.trim() || "",
            imageAlt: data.maintenance.imageAlt?.trim() || "",
            etaISO: data.maintenance.etaISO?.trim() || "",
            contactEmail: data.maintenance.contactEmail?.trim() || "",
          }
        : DEFAULT_SETTINGS.maintenance,
  };
}

/**
 * Pembacaan MENTAH dari Firestore (tanpa cache) — selalu segar.
 * Dipakai dashboard (route GET) yang tidak boleh melihat data basi.
 */
export async function readSiteSettings(): Promise<SiteSettings> {
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

/**
 * Seperti `readSiteSettings`, tetapi juga mengembalikan field `version`
 * (ADM-11) yang dikirim ke form admin sebagai `expectedVersion`.
 */
export async function readSiteSettingsDoc(): Promise<{
  settings: SiteSettings;
  version: string | null;
}> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    if (!db) return { settings: DEFAULT_SETTINGS, version: null };

    const snap = await db.collection("settings").doc(SETTINGS_DOC_ID).get();
    if (!snap.exists) return { settings: DEFAULT_SETTINGS, version: null };

    return {
      settings: mergeSettings(snap.data() as Partial<SiteSettings>),
      version: readVersion(snap.data()),
    };
  } catch (err) {
    console.error("[settings] gagal memuat:", err);
    return { settings: DEFAULT_SETTINGS, version: null };
  }
}

/**
 * Menyimpan pengaturan situs dengan optimistic concurrency (ADM-11).
 * Melempar `VersionConflictError` bila `expectedVersion` tak cocok → route 409.
 * Mengembalikan versi BARU agar klien dapat menyimpan tanpa memuat ulang.
 */
export async function saveSiteSettings(
  settings: SiteSettings,
  updatedBy: string,
  expectedVersion?: unknown,
): Promise<string> {
  return writeVersioned({
    collection: "settings",
    docId: SETTINGS_DOC_ID,
    data: {
      ...settings,
      updatedAtISO: new Date().toISOString(),
      updatedBy,
    },
    expectedVersion,
  });
}

/**
 * Versi ber-CACHE untuk pembaca PUBLIK.
 *
 * `unstable_cache` menyimpan hasil lintas-request di data cache Next sehingga
 * `getSiteSettings()` yang dipanggil di SETIAP halaman (root layout +
 * `generateMetadata`) tidak lagi membaca Firestore berulang kali — penghematan
 * besar saat build (ratusan read) dan saat runtime (ISR).
 *
 * - `tags`: dibatalkan dashboard via `revalidateTag(CACHE_TAGS.settings)`.
 * - `revalidate`: jaring pengaman bila invalidasi tag terlewat (5 menit).
 *
 * Dashboard memakai `readSiteSettings()` (tanpa cache) agar selalu segar.
 */
const getCachedSiteSettings = unstable_cache(
  readSiteSettings,
  ["site-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: 300 },
);

/**
 * Mengambil pengaturan situs dari Firestore (server-side), ber-cache.
 * Fallback ke nilai default bila belum ada / Admin SDK tidak tersedia.
 *
 * Dibungkus `cache()` (React) agar dalam satu request hanya dihitung sekali
 * (dipanggil di `generateMetadata` DAN `RootLayout` — lihat gap G1); lapisan
 * `unstable_cache` di bawahnya menghemat lintas-request.
 */
export const getSiteSettings = cache(
  async (): Promise<SiteSettings> => getCachedSiteSettings(),
);
