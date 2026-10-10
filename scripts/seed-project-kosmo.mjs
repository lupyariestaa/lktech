/**
 * Seed proyek portofolio: "KOSMO — Toko Online Instrumen Meja Kerja".
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-project-kosmo.mjs
 *
 * Membaca kredensial Firebase Admin dari `.env.local`.
 * Sifat: IDEMPOTEN — menjalankan ulang MENIMPA dokumen yang sama. Aman diulang.
 *
 * Catatan: klien "KOSMO Instruments" adalah konsep merek (dummy). Tantangan/
 * solusi berasal dari temuan pengujian nyata (Puppeteer).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ */
/* 1. Muat .env.local                                                    */
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
    "✗ Kredensial Firebase Admin tidak lengkap (.env.local: FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).",
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 2. Data proyek                                                        */
/* ------------------------------------------------------------------ */
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

const PROJECT_SLUG = "kosmo-toko-online-instrumen-meja-kerja";

const project = {
  slug: PROJECT_SLUG,
  title: "KOSMO — Toko Online Instrumen Meja Kerja dengan Checkout WhatsApp",
  client: "KOSMO Instruments",
  category: "E-commerce",
  serviceSlug: "pembuatan-website",
  year: 2026,
  summary:
    "Toko online untuk merek perangkat meja kerja presisi — katalog 10 produk, keranjang nyata yang tersimpan di browser, dan checkout yang mengirim rincian pesanan langsung ke WhatsApp. Tanpa payment gateway, tanpa ribet.",
  pages: "7 halaman · 18 komponen",
  cover: "default",
  accent: "from-[#004EDF] to-[#4D82EC]",
  tags: [
    "Toko Online",
    "E-Commerce",
    "WhatsApp Checkout",
    "Responsive",
    "UMKM",
    "Aksesibilitas",
  ],
  challenge:
    "UMKM sering ingin berjualan online tanpa harus terjebak biaya & integrasi payment gateway. KOSMO membutuhkan toko online yang ringan, cepat, dan langsung bisa memproses pesanan lewat kanal yang sudah dipakai sehari-hari: WhatsApp. Tantangan teknisnya muncul saat pengujian otomatis (Puppeteer) mengungkap cacat yang tak terlihat dari kode: konten di bawah layar tampil kosong karena IntersectionObserver tak terpicu saat scroll cepat, scroll horizontal bocor sampai 682px di mobile, dan audit warna menemukan 161 kegagalan kontras WCAG AA.",
  solution:
    "Setiap temuan diperbaiki di akarnya, bukan sekadar ditekan. Hook reveal ditulis ulang dengan prinsip 'fail visible' (threshold 0 + timer backstop) sehingga konten mustahil tersembunyi permanen; rail produk dipin ke lebar viewport + `overflow-x: clip` di root; token warna digelapkan hingga audit kontras kembali 0 kegagalan; slider filter diberi tinggi 44px agar target sentuh nyaman; dan data ulasan diturunkan otomatis dari katalog agar tak bisa bertentangan. Seluruh visual produk digambar sebagai SVG inline (28 ikon kustom) sehingga toko tetap ringan dan tajam di semua resolusi. Verifikasi dijalankan pada build produksi — 45 kombinasi route × viewport, uji reveal, audit kontras WCAG AA, dan alur belanja end-to-end — semuanya bersih.",
  results: [
    "Alur belanja end-to-end berfungsi: keranjang bertahan setelah refresh, validasi form, hingga pesan WhatsApp tervalidasi",
    "Aksesibilitas tuntas: 0 kegagalan kontras WCAG AA, 88 atribut ARIA, skip-link, focus state, & dukungan prefers-reduced-motion",
    "Build produksi ringan (~88 kB gzip JS) & diuji pada 45 kombinasi route × viewport tanpa masalah",
    "Checkout lewat WhatsApp — tanpa payment gateway, mudah diadopsi UMKM",
    "Seluruh visual produk SVG inline (28 ikon kustom) — tajam di semua resolusi tanpa aset gambar besar",
  ],
  metrics: [
    { label: "Produk katalog", value: "10 produk" },
    { label: "Kategori", value: "5 kategori" },
    { label: "Halaman/route", value: "7 halaman" },
    { label: "Komponen", value: "18 komponen" },
    { label: "Kegagalan kontras a11y", value: "0" },
    { label: "Ukuran build (gzip)", value: "88 kB JS" },
  ],
  techStack: [
    "React 18",
    "React Router 6",
    "Vite 5",
    "CSS (26 file)",
    "SVG inline",
    "Web Storage API",
    "WhatsApp Click-to-Chat",
  ],
  featured: false,
  order: 3,
};

/* ------------------------------------------------------------------ */
/* 3. Tulis ke Firestore                                               */
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
  const ref = db.collection("projects").doc(PROJECT_SLUG);
  const existed = (await ref.get()).exists;

  const payload = {
    ...stripUndefined(project),
    updatedAtISO: new Date().toISOString(),
    updatedBy: "seed-script",
  };

  await ref.set(payload, { merge: true });

  console.log(`✓ Proyek "${project.title}" ${existed ? "DIPERBARUI" : "DIBUAT"} di Firestore.`);
  console.log(`  • Koleksi : projects`);
  console.log(`  • Dokumen : ${PROJECT_SLUG}`);
  console.log(`  • Kategori: ${project.category} | ${project.year} | order=${project.order}`);
  console.log("");
  console.log("Verifikasi:");
  console.log("  1. Buka /portofolio → proyek KOSMO tampil urut ke-4.");
  console.log("  2. Buka /portofolio/" + PROJECT_SLUG + " → studi kasus lengkap.");
}

main().catch((err) => {
  console.error("✗ Gagal seed proyek:", err);
  process.exit(1);
});
