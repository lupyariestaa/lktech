/**
 * Seed satu produk DIGITAL (INSTAN) untuk menguji alur pembayaran online &
 * unduhan otomatis (FASE P0–P1): "Template Katalog Produk UMKM".
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product-template-katalog.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/template-katalog-umkm). Aman diulang.
 *
 * CATATAN PENTING:
 * - Kategori sengaja `software` (BUKAN `jasa`) supaya masuk jalur INSTAN:
 *   pembayaran online otomatis → unduhan otomatis setelah lunas.
 * - Blok `downloadable` SENGAJA DIKOSONGKAN (tidak diikutkan). Upload berkas
 *   lalu isi bagian "Unduhan Otomatis" di /admin/products agar link unduhan
 *   berfungsi. Tanpa itu, order tetap bisa dibayar (produk tetap dijual),
 *   hanya tombol unduhan yang belum ada berkasnya.
 * - Harga > 0 (wajib) agar invoice Mayar dibuat.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ */
/* 1. Muat .env.local secara manual (tanpa dependency tambahan)        */
/* ------------------------------------------------------------------ */
function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.error(`✗ Tidak menemukan .env.local di ${path}`);
    process.exit(1);
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
).trim();

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "✗ Kredensial Firebase Admin tidak lengkap. Pastikan .env.local berisi:\n" +
      "  FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY",
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 2. Data produk                                                      */
/* ------------------------------------------------------------------ */

/** @type {import('firebase-admin/firestore').Firestore} */
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

const PRODUCT_SLUG = "template-katalog-umkm";

const product = {
  slug: PRODUCT_SLUG,
  name: "Template Katalog Produk UMKM",
  tagline:
    "Template website katalog siap pakai untuk UMKM — tinggal ganti produk & kontak, langsung online.",
  description: [
    "Template Katalog Produk UMKM adalah paket website siap pakai yang dirancang untuk usaha kecil dan menengah yang ingin tampil online dengan cepat. Anda cukup mengganti daftar produk, foto, harga, dan kontak — tanpa perlu coding.",
    "",
    "Template sudah responsif (optimal di HP, tablet, desktop), cepat, dan SEO-friendly. Cocok untuk toko, katering, jasa lokal, atau usaha rumahan yang ingin mengkatalogkan produk/layanan secara rapi dan profesional.",
    "",
    "Setelah pembayaran lunas, Anda langsung menerima tautan unduhan berisi source code lengkap + panduan pemasangan. Produk digital — akses otomatis tanpa menunggu admin.",
  ].join("\n"),
  // PENTING: kategori digital (BUKAN `jasa`) agar masuk jalur INSTAN.
  category: "software",
  price: 149000,
  originalPrice: 299000,
  cover: "default",
  coverPublicId: undefined,
  gallery: [],
  badge: "Produk Digital",
  features: [
    {
      title: "Siap Pakai",
      description: "Tinggal ganti produk, foto, harga, & kontak.",
    },
    {
      title: "Responsif",
      description: "Optimal di HP, tablet, dan desktop.",
    },
    {
      title: "Unduhan Instan",
      description: "Akses otomatis setelah pembayaran lunas.",
    },
    {
      title: "SEO-Friendly",
      description: "Struktur rapi untuk mesin pencari.",
    },
  ],
  specs: [
    { label: "Teknologi", value: "Next.js + Tailwind CSS" },
    { label: "Format", value: "Source code (.zip)" },
    { label: "Pengiriman", value: "Unduhan otomatis" },
    { label: "Lisensi", value: "1 usaha" },
  ],
  tools: ["Next.js", "Tailwind CSS", "TypeScript"],
  includes: [
    "Source code template lengkap",
    "Panduan pemasangan (PDF)",
    "Halaman katalog + detail produk",
    "Contoh data siap diganti",
    "Update gratis 3 bulan",
  ],
  delivery: "Instan (unduhan otomatis)",
  process: [
    {
      step: "1",
      title: "Checkout & bayar",
      description: "Pilih produk, checkout, lalu bayar online (QRIS/VA/e-wallet).",
    },
    {
      step: "2",
      title: "Pembayaran dikonfirmasi otomatis",
      description: "Sistem memverifikasi pembayaran Anda secara otomatis (24/7).",
    },
    {
      step: "3",
      title: "Unduh produk",
      description:
        "Tautan unduhan dikirim ke email Anda & tampil di halaman Akun → Pesanan.",
    },
  ],
  notes: [
    "Ini produk DIGITAL: akses dikirim otomatis setelah pembayaran lunas.",
    "Tautan unduhan berlaku terbatas (lihat halaman unduhan) — sebaiknya segera unduh & simpan berkasnya.",
    "Lisensi untuk 1 usaha. Untuk penggunaan lebih dari satu usaha, hubungi kami.",
    "Belum termasuk biaya domain & hosting (dibeli terpisah oleh Anda).",
  ],
  variants: [],
  soldOut: false,
  featured: true,
  active: true,
  // downloadable SENGAJA TIDAK DIISI — upload berkas & isi di /admin/products.
  waMessage: undefined,
};

/* ------------------------------------------------------------------ */
/* 3. Bersihkan `undefined` & tulis ke Firestore                       */
/* ------------------------------------------------------------------ */
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

async function main() {
  const col = db.collection("products");
  const ref = col.doc(PRODUCT_SLUG);
  const existed = (await ref.get()).exists;

  const payload = {
    ...stripUndefined(product),
    updatedAtISO: new Date().toISOString(),
    updatedBy: "seed-script",
  };

  await ref.set(payload, { merge: false });

  console.log(
    `✓ Produk "${product.name}" ${existed ? "DIPERBARUI" : "DIBUAT"} di Firestore.`,
  );
  console.log(`  • Koleksi  : products`);
  console.log(`  • Dokumen  : ${PRODUCT_SLUG}`);
  console.log(`  • Kategori : ${product.category} (jalur INSTAN / unduhan)`);
  console.log(`  • Harga    : Rp ${product.price.toLocaleString("id-ID")}`);
  console.log(`  • Project  : ${projectId}`);
  console.log("");
  console.log("Langkah verifikasi:");
  console.log(`  1. Buka /admin/products → produk "${product.name}" muncul.`);
  console.log(`  2. Buka /produk → kartu produk tampil dengan harga Rp 149.000.`);
  console.log(`  3. UPLOAD berkas ke Cloudinary → salin URL.`);
  console.log(
    `  4. Di /admin/products → edit produk ini → bagian "Unduhan Otomatis" →`,
  );
  console.log(`     aktifkan & tambahkan berkas (nama + URL). Simpan.`);
  console.log(`  5. Baru uji checkout → bayar → unduhan (Langkah 5).`);
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
