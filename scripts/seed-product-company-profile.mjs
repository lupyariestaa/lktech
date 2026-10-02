/**
 * Seed satu produk: "Paket Website Company Profile" (3 varian) ke Firestore.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product-company-profile.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/paket-website-company-profile). Aman diulang.
 *
 * Produk ini mengikuti pola "Paket Website Portfolio" (multi-varian 3 paket:
 * Basic / Profesional / Custom), dengan konten disesuaikan untuk kebutuhan
 * website Company Profile (profil perusahaan).
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

const PRODUCT_SLUG = "paket-website-company-profile";

const product = {
  slug: PRODUCT_SLUG,
  name: "Paket Website Company Profile",
  tagline:
    "Website profil perusahaan profesional yang siap dipakai — cukup kirim data & referensi, sisanya kami kerjakan.",
  description: [
    "Website company profile adalah representasi resmi perusahaan Anda di internet. LKTech membuatkan website profil perusahaan yang profesional, kredibel, dan siap pakai — Anda cukup memilih paket, mengirimkan data perusahaan serta referensi desain, dan kami mengerjakannya untuk Anda.",
    "",
    "Pilih dari tiga paket sesuai kebutuhan: Basic untuk menampilkan profil perusahaan secara profesional dengan cepat, Profesional untuk yang butuh multi-halaman lengkap dengan dashboard kelola konten, dan Custom untuk kebutuhan paling lengkap & fleksibel.",
    "",
    "Berbeda dari layanan custom, produk ini bersifat terima jadi (seperti template premium) — namun dengan personalisasi data sesuai identitas perusahaan Anda.",
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
  delivery: "3–7 hari kerja",
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
        "Anda mengirimkan data perusahaan (profil, layanan, kontak, logo) serta referensi desain melalui WhatsApp.",
    },
    {
      step: "3",
      title: "Kami kerjakan",
      description:
        "Tim LKTech mengerjakan website perusahaan Anda sesuai paket yang dipilih.",
    },
    {
      step: "4",
      title: "Website siap & revisi",
      description:
        "Website diserahkan; revisi minor gratis selama permintaan masih wajar.",
    },
  ],
  notes: [
    "Data perusahaan (profil, visi & misi, layanan, legalitas, kontak, sosial media) & referensi desain ditagih melalui WhatsApp setelah checkout — bukan diisi di website.",
    "Produk ini bersifat terima jadi: permintaan teknologi, framework, atau fitur di luar paket tidak dapat dikustom (beda dengan Layanan custom). Silakan konsultasi untuk paket yang disesuaikan.",
    "Revisi minor gratis selama permintaan masih wajar. Revisi di luar cakupan paket dibahas terpisah.",
    "Domain & hosting gratis berlaku sesuai durasi paket; perpanjangan setelahnya menjadi tanggungan Anda.",
    "Waktu pengerjaan dihitung setelah semua data & referensi lengkap diterima.",
  ],
  variants: [
    {
      slug: "company-profile-basic",
      name: "Company Profile Basic",
      tagline: "Tampilkan profil perusahaan Anda secara profesional.",
      price: 350000,
      originalPrice: 700000,
      highlight: false,
      soldOut: false,
      delivery: "3–5 hari kerja",
      features: [
        { title: "Domain gratis 1 tahun", description: "Sudah termasuk aktivasi." },
        { title: "Hosting gratis 1 bulan", description: "Langsung online." },
        { title: "Desain modern & korporat", description: "Kesan profesional & terpercaya." },
        { title: "100% responsive", description: "Optimal di HP, tablet, & desktop." },
        { title: "SEO dasar", description: "Meta & struktur halaman yang rapi." },
        { title: "1 halaman profil", description: "Profil, layanan, & kontak dalam satu halaman." },
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
        "Website company profile siap online",
        "Desain sesuai referensi yang dikirim",
        "Personalisasi data perusahaan (profil, layanan, kontak, logo)",
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
      slug: "company-profile-profesional",
      name: "Company Profile Profesional",
      tagline: "Multi-halaman lengkap + dashboard kelola konten.",
      price: 650000,
      originalPrice: 1300000,
      badge: "Paling Populer",
      highlight: true,
      soldOut: false,
      delivery: "3–7 hari kerja",
      features: [
        { title: "Semua fitur Company Profile Basic", description: "Sudah termasuk." },
        { title: "Hosting gratis 1 tahun", description: "Lebih hemat." },
        { title: "Dashboard kelola konten (basic)", description: "Update konten perusahaan sendiri." },
        { title: "SEO lebih lengkap", description: "Optimasi lebih menyeluruh." },
        { title: "Multi-halaman", description: "Beranda, Tentang, Layanan, Portofolio, Kontak." },
        { title: "Halaman karier / lowongan", description: "Tampilkan lowongan pekerjaan aktif." },
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
        "Setup halaman layanan, portofolio, & karier",
      ],
      limits: [
        "Dashboard basic (fitur terbatas, tidak untuk struktur rumit)",
        "Maksimal 8 halaman",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "company-profile-custom",
      name: "Company Profile Custom",
      tagline: "Sepenuhnya disesuaikan — paling fleksibel.",
      price: 950000,
      originalPrice: 1900000,
      highlight: false,
      soldOut: false,
      delivery: "5–10 hari kerja",
      features: [
        { title: "Semua fitur Company Profile Profesional", description: "Sudah termasuk." },
        { title: "Dashboard proper", description: "Lebih lengkap & rapi." },
        { title: "Custom desain lebih bebas", description: "Sesuai identitas brand perusahaan." },
        { title: "Multi-halaman lebih banyak", description: "Kapasitas halaman lebih besar." },
        { title: "Section & fitur custom", description: "Blog, karier, multi-bahasa, dsb. sesuai kebutuhan." },
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
        "Fitur di luar cakupan website company profile dibahas terpisah",
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
  console.log(`  1. Buka /admin/products → produk "${product.name}" muncul (3 paket).`);
  console.log(`  2. Buka /produk → kartu "Mulai Rp 350.000" + badge "3 paket".`);
  console.log(`  3. Buka /produk/${PRODUCT_SLUG} → 3 kartu paket + alur + catatan.`);
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
