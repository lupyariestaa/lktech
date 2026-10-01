/**
 * Seed satu produk: "Paket Website Portfolio" (3 varian) ke Firestore.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/paket-website-portfolio). Aman diulang.
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
    // Buang tanda kutip pembuka/penutup bila ada.
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

const PRODUCT_SLUG = "paket-website-portfolio";

const product = {
  slug: PRODUCT_SLUG,
  name: "Paket Website Portfolio",
  tagline:
    "Website portfolio profesional yang siap dipakai — cukup kirim data & referensi, sisanya kami kerjakan.",
  description: [
    "Website portfolio adalah “wajah online” Anda yang pertama dilihat calon klien. LKTech membuatkan website portfolio profesional yang sudah jadi dan siap pakai — Anda cukup memilih paket, mengirimkan data identitas serta referensi desain, dan kami mengerjakannya untuk Anda.",
    "",
    "Pilih dari tiga paket sesuai kebutuhan: Basic untuk tampil profesional dengan cepat, Profesional untuk yang butuh multi-halaman & dashboard kelola konten, dan Custom untuk kebutuhan paling lengkap & fleksibel.",
    "",
    "Berbeda dari layanan custom, produk ini bersifat terima jadi (seperti template premium) — namun dengan personalisasi data sesuai identitas Anda.",
  ].join("\n"),
  category: "jasa",
  // Produk multi-varian: harga level produk diabaikan (dianggap 0).
  price: 0,
  cover: "default",
  coverPublicId: undefined,
  gallery: [],
  badge: undefined,
  // Fitur/spec/includes level produk dikosongkan (detail ada di tiap varian).
  features: [],
  specs: [],
  tools: ["Next.js", "Tailwind CSS", "TypeScript", "Vercel"],
  includes: [],
  delivery: "1–3 hari kerja",
  process: [
    {
      step: "1",
      title: "Pilih paket & checkout",
      description: "Pilih paket yang sesuai, lalu checkout melalui WhatsApp.",
    },
    {
      step: "2",
      title: "Kirim data & referensi",
      description:
        "Anda mengirimkan data identitas serta referensi desain (gambar/link) melalui WhatsApp.",
    },
    {
      step: "3",
      title: "Kami kerjakan",
      description:
        "Tim LKTech mengerjakan website Anda dalam 1–3 hari kerja.",
    },
    {
      step: "4",
      title: "Website siap & revisi",
      description:
        "Website diserahkan; revisi minor gratis selama permintaan masih wajar.",
    },
  ],
  notes: [
    "Data identitas (nama, foto, kontak, sosial media) & referensi desain ditagih melalui WhatsApp setelah checkout — bukan diisi di website.",
    "Produk ini bersifat terima jadi: permintaan teknologi, framework, atau fitur di luar paket tidak dapat dikustom (beda dengan Layanan custom). Silakan konsultasi untuk paket yang disesuaikan.",
    "Revisi minor gratis selama permintaan masih wajar. Revisi di luar cakupan paket dibahas terpisah.",
    "Domain & hosting gratis berlaku sesuai durasi paket; perpanjangan setelahnya menjadi tanggungan Anda.",
    "Waktu pengerjaan dihitung setelah semua data & referensi lengkap diterima.",
  ],
  variants: [
    {
      slug: "portfolio-basic",
      name: "Portfolio Basic",
      tagline: "Tampil profesional online dengan cepat.",
      price: 250000,
      originalPrice: 500000,
      highlight: false,
      soldOut: false,
      delivery: "1–3 hari kerja",
      features: [
        { title: "Domain gratis 1 tahun", description: "Sudah termasuk aktivasi." },
        { title: "Hosting gratis 1 bulan", description: "Langsung online." },
        { title: "Desain modern & minimalis", description: "Bersih dan profesional." },
        { title: "100% responsive", description: "Optimal di HP, tablet, & desktop." },
        { title: "SEO dasar", description: "Meta & struktur halaman yang rapi." },
        { title: "1 halaman profil", description: "Semua info penting dalam satu halaman." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 bulan" },
        { label: "Halaman", value: "1 halaman" },
        { label: "Dashboard", value: "Tidak ada" },
        { label: "SEO", value: "Dasar" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Website portfolio siap online",
        "Desain sesuai referensi yang dikirim",
        "Personalisasi data (nama, foto, kontak, sosial media)",
        "Aktivasi domain & hosting awal",
      ],
      limits: [
        "Tidak termasuk dashboard kelola konten",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Maksimal 1 halaman",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "portfolio-profesional",
      name: "Portfolio Profesional",
      tagline: "Multi-halaman + dashboard kelola konten.",
      price: 500000,
      originalPrice: 1000000,
      badge: "Paling Populer",
      highlight: true,
      soldOut: false,
      delivery: "1–3 hari kerja",
      features: [
        { title: "Semua fitur Portfolio Basic", description: "Sudah termasuk." },
        { title: "Hosting gratis 1 tahun", description: "Lebih hemat." },
        { title: "Dashboard kelola konten (basic)", description: "Update konten sendiri." },
        { title: "SEO lebih lengkap", description: "Optimasi lebih menyeluruh." },
        { title: "Multi-halaman", description: "Home, Tentang, Portfolio, Kontak." },
        { title: "Galeri karya lebih banyak", description: "Tampilkan lebih banyak proyek." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Halaman", value: "Multi-halaman" },
        { label: "Dashboard", value: "Basic (kelola konten)" },
        { label: "SEO", value: "Lengkap" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Basic",
        "Website multi-halaman",
        "Dashboard admin untuk kelola konten",
        "Optimasi SEO lebih lengkap",
        "Setup galeri portfolio",
      ],
      limits: [
        "Dashboard basic (fitur terbatas, tidak untuk struktur rumit)",
        "Maksimal ±5 halaman",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "portfolio-custom",
      name: "Portfolio Custom",
      tagline: "Sepenuhnya disesuaikan — paling fleksibel.",
      price: 750000,
      originalPrice: 1500000,
      highlight: false,
      soldOut: false,
      delivery: "1–3 hari kerja",
      features: [
        { title: "Semua fitur Portfolio Profesional", description: "Sudah termasuk." },
        { title: "Dashboard proper", description: "Lebih lengkap & rapi." },
        { title: "Custom desain lebih bebas", description: "Sesuai selera Anda." },
        { title: "Multi-halaman lebih banyak", description: "Kapasitas halaman lebih besar." },
        { title: "Section custom", description: "Blok konten sesuai kebutuhan." },
        { title: "Prioritas pengerjaan", description: "Dikerjakan lebih dahulu." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Halaman", value: "Multi-halaman (lebih banyak)" },
        { label: "Dashboard", value: "Proper / lengkap" },
        { label: "SEO", value: "Lengkap" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Profesional",
        "Dashboard admin versi proper",
        "Desain & section lebih bebas disesuaikan",
        "Jumlah halaman lebih banyak",
        "Pengerjaan prioritas",
      ],
      limits: [
        "Detail cakupan disesuaikan saat konsultasi",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Fitur di luar cakupan website portfolio dibahas terpisah",
        "Revisi minor (selama wajar)",
      ],
    },
  ],
  soldOut: false,
  featured: true,
  active: true,
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

  console.log(`✓ Produk "${product.name}" ${existed ? "DIPERBARUI" : "DIBUAT"} di Firestore.`);
  console.log(`  • Koleksi : products`);
  console.log(`  • Dokumen : ${PRODUCT_SLUG}`);
  console.log(`  • Varian  : ${product.variants.map((v) => v.slug).join(", ")}`);
  console.log(`  • Project : ${projectId}`);
  console.log("");
  console.log("Langkah verifikasi:");
  console.log("  1. Buka /admin/products → produk \"Paket Website Portfolio\" muncul (3 paket).");
  console.log("  2. Buka /produk → kartu \"Mulai Rp 250.000\" + badge \"3 paket\".");
  console.log("  3. Buka /produk/paket-website-portfolio → 3 kartu paket + alur + catatan.");
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
