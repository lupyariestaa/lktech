import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { getProducts } from "@/lib/products";
import {
  diffProductAlerts,
  toProductState,
  type ProductSnapshot,
  type ProductState,
  type WishlistAlert,
} from "@/lib/wishlist-alert-pure";
import { buildWishlistAlertEmail } from "@/lib/email-wishlist";
import { SITE_URL } from "@/lib/site";

/**
 * ALERT WISHLIST (Tema 2.4, FASE R3).
 *
 * Cron membandingkan kondisi produk (harga/stok) kini dengan snapshot tersimpan
 * (`product_alerts_state/{slug}`). Bila ada perubahan ("harga turun" / "kembali
 * tersedia"), kirim email ke pemilik wishlist produk tsb (cooldown per user).
 *
 * Best-effort & aman tanpa Admin SDK.
 */

const STATE_COLLECTION = "product_alerts_state";

export type WishlistAlertResult = {
  productsScanned: number;
  alertsDetected: number;
  emailsSent: number;
  failed: number;
};

/** Ambil snapshot tersimpan untuk banyak slug. */
async function getStates(slugs: string[]): Promise<Map<string, ProductState>> {
  const db = getAdminDb();
  const map = new Map<string, ProductState>();
  if (!db || slugs.length === 0) return map;
  const refs = slugs.map((s) => db.collection(STATE_COLLECTION).doc(s));
  const snaps = await db.getAll(...refs);
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const d = snap.data() ?? {};
    map.set(snap.id, {
      price: typeof d.price === "number" ? d.price : 0,
      soldOut: d.soldOut === true,
      stock: typeof d.stock === "number" ? d.stock : undefined,
    });
  }
  return map;
}

/** Simpan snapshot keadaan produk. */
async function saveStates(snaps: ProductSnapshot[]): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const batch = db.batch();
  for (const s of snaps) {
    batch.set(
      db.collection(STATE_COLLECTION).doc(s.slug),
      { ...toProductState(s), updatedAtISO: new Date().toISOString() },
      { merge: true },
    );
  }
  await batch.commit();
}

/** Peta slug → daftar email pemilik wishlist. */
async function mapWishlistOwners(): Promise<Map<string, string[]>> {
  const db = getAdminDb();
  const map = new Map<string, string[]>();
  if (!db) return map;
  const snap = await db.collection("users").limit(5000).get();
  snap.forEach((doc) => {
    const email = String(doc.get("email") ?? "").toLowerCase();
    if (!email) return;
    const wishlist = doc.get("wishlist");
    if (!Array.isArray(wishlist)) return;
    for (const slug of wishlist) {
      if (typeof slug !== "string" || !slug) continue;
      const list = map.get(slug) ?? [];
      list.push(email);
      map.set(slug, list);
    }
  });
  return map;
}

/** Jalankan pemeriksaan & kirim alert. `now` dapat diinjeksi untuk pengujian. */
export async function runWishlistAlerts(
  now: Date = new Date(),
): Promise<WishlistAlertResult> {
  const result: WishlistAlertResult = {
    productsScanned: 0,
    alertsDetected: 0,
    emailsSent: 0,
    failed: 0,
  };

  const products = await getProducts();
  result.productsScanned = products.length;
  if (products.length === 0) return result;

  const owners = await mapWishlistOwners();
  const watchedSlugs = products.filter((p) => owners.has(p.slug)).map((p) => p.slug);
  if (watchedSlugs.length === 0) {
    // Tetap simpan snapshot agar perbandingan berikutnya punya basis.
    await saveStates(
      products.map((p) => ({
        slug: p.slug,
        price: p.price,
        originalPrice: p.originalPrice,
        soldOut: p.soldOut,
        stock: p.stock,
      })),
    );
    return result;
  }

  const prevStates = await getStates(watchedSlugs);

  const allSnapshots: ProductSnapshot[] = [];
  for (const p of products) {
    const snap: ProductSnapshot = {
      slug: p.slug,
      price: p.price,
      originalPrice: p.originalPrice,
      soldOut: p.soldOut,
      stock: p.stock,
    };
    allSnapshots.push(snap);

    if (!owners.has(p.slug)) continue;
    const alerts = diffProductAlerts(snap, prevStates.get(p.slug) ?? null);
    if (alerts.length === 0) continue;
    result.alertsDetected += alerts.length;

    // Kirim ke pemilik wishlist (dengan cooldown per email+slug).
    for (const email of owners.get(p.slug) ?? []) {
      const sent = await sendAlertToUser(email, p.name, alerts, now);
      if (sent === "sent") result.emailsSent += 1;
      else if (sent === "failed") result.failed += 1;
    }
  }

  await saveStates(allSnapshots);
  return result;
}

/** Kirim email alert ke satu user (dengan cooldown). */
async function sendAlertToUser(
  email: string,
  productName: string,
  alerts: WishlistAlert[],
  now: Date,
): Promise<"sent" | "failed" | "skipped"> {
  const db = getAdminDb();
  if (!db) return "skipped";
  const key = `${email}::${alerts[0].slug}`;

  // Cooldown via koleksi `wishlist_alerts_log/{key}`.
  try {
    const logRef = db.collection("wishlist_alerts_log").doc(encodeURIComponent(key));
    const log = await logRef.get();
    if (log.exists) {
      const last = String(log.get("lastSentISO") ?? "");
      const t = new Date(last).getTime();
      if (Number.isFinite(t) && now.getTime() - t < 72 * 3_600_000) return "skipped";
    }

    const productUrl = `${SITE_URL}/produk/${alerts[0].slug}`;
    const res = await buildWishlistAlertEmail({ email, productName, alerts, productUrl });
    await logRef.set({ lastSentISO: now.toISOString(), email, slug: alerts[0].slug }, { merge: true });
    return res.ok ? "sent" : res.skipped ? "skipped" : "failed";
  } catch (err) {
    console.error("[wishlist-alert] gagal kirim:", err);
    return "failed";
  }
}
