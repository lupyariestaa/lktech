import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type { MediaItem, MediaUsage } from "@/lib/media-types";
import { normalizeMediaItem } from "@/lib/media-normalize";
import { extractImageUrls } from "@/lib/markdown-insert";

/**
 * Pelacakan penggunaan aset media (FASE M3).
 *
 * Sumber kebenaran "sebuah aset dipakai di mana" adalah KONTEN yang memakai
 * media (produk, artikel, proyek, hero). Fungsi `scanMediaUsage()` memindai
 * koleksi-koleksi itu dan membangun indeks `mediaId/publicId/url → MediaUsage[]`.
 *
 * Pencocokan dilakukan lewat DUA kunci karena bentuk referensi berbeda:
 * - `publicId` (mis. products.coverPublicId, content.hero.*.publicId)
 * - `secureUrl`/url persis (mis. products.gallery[], article.coverImage,
 *   project.cover, hero.*.url) — banyak field hanya menyimpan URL.
 */

/** Kunci indeks untuk sebuah referensi media. */
type UsageIndex = Map<string, MediaUsage[]>;

/** Normalisasi URL untuk pencocokan longgar (buang query/hash & transformasi). */
function normalizeUrl(url: string): string {
  const raw = (url ?? "").trim();
  if (!raw || raw === "default") return "";
  // Buang query/hash.
  const noQuery = raw.split("?")[0].split("#")[0];
  return noQuery;
}

/**
 * Ekstrak publicId dari URL Cloudinary bila memungkinkan:
 * https://res.cloudinary.com/<cloud>/image/upload/<transform>/<publicId>
 * Transformasi (segmen berisi "," atau awalan "v1234") dilewati.
 */
function publicIdFromUrl(url: string): string {
  const clean = normalizeUrl(url);
  const marker = "/image/upload/";
  const idx = clean.indexOf(marker);
  if (idx === -1) return "";
  let rest = clean.slice(idx + marker.length);
  // Buang segmen transformasi/versi hingga publicId "asli".
  const parts = rest.split("/");
  const filtered = parts.filter(
    (p) => p && !/^v\d+$/.test(p) && !/[,_]/.test(p),
  );
  rest = filtered.join("/");
  return rest;
}

/** Tambahkan satu referensi ke indeks di bawah semua kunci yang relevan. */
function addRef(
  index: UsageIndex,
  keys: { publicId?: string; url?: string },
  usage: MediaUsage,
) {
  const set = (key: string) => {
    if (!key) return;
    const list = index.get(key) ?? [];
    // Hindari duplikat persis.
    if (
      !list.some(
        (u) =>
          u.type === usage.type &&
          u.refId === usage.refId &&
          u.field === usage.field,
      )
    ) {
      list.push(usage);
      index.set(key, list);
    }
  };

  if (keys.publicId) set(keys.publicId);
  const urlClean = keys.url ? normalizeUrl(keys.url) : "";
  if (urlClean) {
    set(urlClean);
    const pid = publicIdFromUrl(urlClean);
    if (pid) set(pid);
  }
}

/**
 * Memindai seluruh konten dan mengembalikan indeks penggunaan per aset.
 * Kunci indeks: `id`, `publicId`, `secureUrl`, dan publicId hasil ekstraksi URL.
 */
export async function scanMediaUsage(db: Firestore): Promise<UsageIndex> {
  const index: UsageIndex = new Map();

  await Promise.all([
    scanProducts(db, index),
    scanArticles(db, index),
    scanProjects(db, index),
    scanHero(db, index),
  ]);

  return index;
}

async function scanProducts(db: Firestore, index: UsageIndex) {
  const snap = await db.collection("products").get();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const slug = (typeof d.slug === "string" && d.slug) || doc.id;
    const name = (typeof d.name === "string" && d.name) || slug;
    const label = `Produk: ${name}`;

    // Cover (produk tunggal/multi-varian): pakai coverPublicId bila ada,
    // dan URL cover untuk pencocokan.
    const cover = typeof d.cover === "string" ? d.cover : "";
    const coverPublicId =
      typeof d.coverPublicId === "string" ? d.coverPublicId : "";
    if (coverPublicId || (cover && cover !== "default")) {
      addRef(
        index,
        { publicId: coverPublicId, url: cover },
        { type: "product", refId: slug, label, field: "cover" },
      );
    }

    // Galeri produk (array URL).
    if (Array.isArray(d.gallery)) {
      d.gallery.forEach((url, i) => {
        if (typeof url === "string" && url && url !== "default") {
          addRef(
            index,
            { url },
            { type: "product", refId: slug, label, field: `gallery[${i}]` },
          );
        }
      });
    }
  }
}

async function scanArticles(db: Firestore, index: UsageIndex) {
  const snap = await db.collection("articles").get();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const slug = (typeof d.slug === "string" && d.slug) || doc.id;
    const title = (typeof d.title === "string" && d.title) || slug;
    const label = `Artikel: ${title}`;

    const coverImage = typeof d.coverImage === "string" ? d.coverImage : "";
    if (coverImage && coverImage !== "default") {
      addRef(
        index,
        { url: coverImage },
        { type: "article", refId: slug, label, field: "coverImage" },
      );
    }

    // B1.6: gambar inline di body (`![alt](url)`).
    const body = typeof d.body === "string" ? d.body : "";
    extractImageUrls(body).forEach((url, i) => {
      addRef(
        index,
        { url },
        { type: "article", refId: slug, label, field: `body[${i}]` },
      );
    });
  }
}

async function scanProjects(db: Firestore, index: UsageIndex) {
  const snap = await db.collection("projects").get();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const slug = (typeof d.slug === "string" && d.slug) || doc.id;
    const title = (typeof d.title === "string" && d.title) || slug;
    const label = `Proyek: ${title}`;

    const cover = typeof d.cover === "string" ? d.cover : "";
    if (cover && cover !== "default") {
      addRef(
        index,
        { url: cover },
        { type: "project", refId: slug, label, field: "cover" },
      );
    }
  }
}

async function scanHero(db: Firestore, index: UsageIndex) {
  // Hero showcase disimpan di content/site (atau content/site-content).
  for (const docId of ["site", "site-content"]) {
    const doc = await db.collection("content").doc(docId).get();
    if (!doc.exists) continue;
    const d = doc.data() as Record<string, unknown>;
    const hero = d.hero as
      | { browser?: unknown[]; mobile?: unknown[] }
      | undefined;
    if (!hero) continue;

    const columns: Array<["browser" | "mobile", unknown[] | undefined]> = [
      ["browser", hero.browser],
      ["mobile", hero.mobile],
    ];
    for (const [col, list] of columns) {
      if (!Array.isArray(list)) continue;
      list.forEach((img, i) => {
        if (!img || typeof img !== "object") return;
        const im = img as Record<string, unknown>;
        const url = typeof im.url === "string" ? im.url : "";
        const publicId = typeof im.publicId === "string" ? im.publicId : "";
        if (url || publicId) {
          addRef(
            index,
            { publicId, url },
            {
              type: "hero",
              refId: `${docId}:hero.${col}[${i}]`,
              label: `Hero (${col === "browser" ? "browser" : "mobile"} #${i + 1})`,
              field: `hero.${col}[${i}]`,
            },
          );
        }
      });
    }
  }
}

/** Ambil referensi pemakaian untuk satu aset media dari indeks. */
export function usagesForItem(index: UsageIndex, item: MediaItem): MediaUsage[] {
  const keys = new Set<string>([item.id, item.publicId, normalizeUrl(item.secureUrl)]);
  const pid = publicIdFromUrl(item.secureUrl);
  if (pid) keys.add(pid);

  const result: MediaUsage[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (!key) continue;
    for (const u of index.get(key) ?? []) {
      const sig = `${u.type}|${u.refId}|${u.field}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      result.push(u);
    }
  }
  return result;
}

/** Daftar aset media yang tidak dipakai di konten mana pun (orphan). */
export function findOrphans(
  items: MediaItem[],
  index: UsageIndex,
): MediaItem[] {
  return items.filter(
    (it) => it.status !== "trashed" && usagesForItem(index, it).length === 0,
  );
}

/**
 * Pindai ulang seluruh media, hitung usage, dan simpan denormalisasi
 * (`usageCount` + `usedIn`) ke setiap dokumen `media`. Mengembalikan ringkasan.
 */
export async function refreshMediaUsage(
  db: Firestore,
): Promise<{ scanned: number; used: number }> {
  const index = await scanMediaUsage(db);

  const snap = await db.collection("media").get();
  const items = snap.docs.map((doc) => normalizeMediaItem(doc.id, doc.data()));

  // Batch update (Firestore batas 500 operasi/batch).
  const batches: Array<ReturnType<Firestore["batch"]>> = [];
  let batch = db.batch();
  let ops = 0;
  let used = 0;

  for (const item of items) {
    const usedIn = usagesForItem(index, item);
    const usageCount = usedIn.length;
    if (usageCount > 0) used += 1;

    // Hanya tulis bila ada perubahan bermakna (hemat write).
    const same =
      item.usageCount === usageCount &&
      JSON.stringify(item.usedIn) === JSON.stringify(usedIn);
    if (same) continue;

    batch.update(db.collection("media").doc(item.id), {
      usageCount,
      usedIn,
    });
    ops += 1;
    if (ops === 450) {
      batches.push(batch);
      batch = db.batch();
      ops = 0;
    }
  }
  batches.push(batch);

  for (const b of batches) {
    await b.commit();
  }

  return { scanned: items.length, used };
}
