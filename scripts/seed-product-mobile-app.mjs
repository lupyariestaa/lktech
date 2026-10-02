/**
 * Seed satu produk: "Paket Aplikasi Mobile" (3 varian) ke Firestore.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product-mobile-app.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/paket-aplikasi-mobile). Aman diulang.
 *
 * Produk multi-varian 3 paket (Basic / Profesional / Custom) untuk pembuatan
 * APLIKASI MOBILE (Android/iOS) bagi bisnis umum: katalog, pesanan, profil,
 * notifikasi, dsb.
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

const PRODUCT_SLUG = "paket-aplikasi-mobile";

const product = {
  slug: PRODUCT_SLUG,
  name: "Paket Aplikasi Mobile",
  tagline:
    "Aplikasi Android & iOS siap pakai untuk bisnis Anda — katalog, pesanan, profil, dan notifikasi dalam satu aplikasi.",
  description: [
    "Aplikasi mobile adalah cara paling efektif untuk selalu dekat dengan pelanggan Anda. LKTech membuatkan aplikasi Android & iOS yang profesional, cepat, dan siap pakai — Anda cukup memilih paket, mengirimkan data bisnis serta referensi desain, dan kami mengerjakannya untuk Anda.",
    "",
    "Cocok untuk berbagai jenis bisnis: katalog produk, penerimaan pesanan, profil usaha, konten informasi, hingga integrasi dengan sistem yang sudah Anda miliki. Aplikasi dibangun dengan teknologi modern (React Native) sehingga satu basis kode dapat berjalan di Android maupun iOS.",
    "",
    "Pilih dari tiga paket sesuai kebutuhan: Basic untuk membangun kehadiran mobile dengan cepat, Profesional untuk aplikasi yang butuh katalog, pesanan, & notifikasi, dan Custom untuk kebutuhan paling lengkap seperti integrasi sistem, pembayaran, dan fitur khusus lainnya. Berbeda dari layanan custom, produk ini bersifat terima jadi — namun tetap disesuaikan dengan identitas brand Anda.",
  ].join("\n"),
  category: "aplikasi",
  // Produk multi-varian: harga level produk diabaikan (dianggap 0).
  price: 0,
  cover: "default",
  coverPublicId: undefined,
  gallery: [],
  badge: undefined,
  // Fitur/spec/includes level produk dikosongkan (detail ada di tiap varian).
  features: [],
  specs: [],
  tools: ["React Native", "Expo", "TypeScript", "Firebase"],
  includes: [],
  delivery: "10–40 hari kerja",
  process: [
    {
      step: "1",
      title: "Pilih paket & checkout",
      description:
        "Pilih paket sesuai kebutuhan aplikasi, lalu checkout melalui WhatsApp.",
    },
    {
      step: "2",
      title: "Kirim data & referensi",
      description:
        "Anda mengirimkan data bisnis (profil, produk/konten, kontak) serta referensi desain melalui WhatsApp.",
    },
    {
      step: "3",
      title: "Kami kerjakan",
      description:
        "Tim LKTech membangun aplikasi Anda sesuai paket — dari desain hingga siap dirilis.",
    },
    {
      step: "4",
      title: "Uji & serah terima",
      description:
        "Kami uji aplikasi, lalu menyerahkannya beserta pendampingan; revisi minor gratis selama permintaan masih wajar.",
    },
  ],
  notes: [
    "Data bisnis (profil, produk/konten, kontak, logo) & referensi desain ditagih melalui WhatsApp setelah checkout — bukan diisi di website.",
    "Biaya akun developer (Google Play / Apple App Store), domain, serta layanan pihak ketiga (payment gateway, push notifikasi, dsb.) di luar paket menjadi tanggungan Anda.",
    "Produk ini bersifat terima jadi: permintaan teknologi, framework, atau fitur di luar paket tidak dapat dikustom (beda dengan Layanan custom). Silakan konsultasi untuk paket yang disesuaikan.",
    "Rilis ke Google Play / App Store dibantu prosesnya; waktu review mengikuti kebijakan masing-masing store.",
    "Revisi minor gratis selama permintaan masih wajar. Revisi di luar cakupan paket dibahas terpisah.",
    "Waktu pengerjaan dihitung setelah semua data & referensi lengkap diterima.",
  ],
  variants: [
    {
      slug: "mobile-basic",
      name: "Aplikasi Mobile Basic",
      tagline: "Membangun kehadiran mobile dengan cepat & profesional.",
      price: 3500000,
      originalPrice: 5500000,
      highlight: false,
      soldOut: false,
      delivery: "10–14 hari kerja",
      features: [
        { title: "Android & iOS", description: "Satu aplikasi, dua platform (React Native)." },
        { title: "Desain modern & custom brand", description: "Sesuai identitas bisnis Anda." },
        { title: "Profil & info bisnis", description: "Tentang, kontak, lokasi, sosial media." },
        { title: "Konten statis (info/katalog)", description: "Daftar layanan/produk atau informasi." },
        { title: "Notifikasi dasar", description: "Info penting ke pengguna." },
        { title: "Bantuan rilis ke store", description: "Pendampingan upload ke Play/App Store." },
      ],
      specs: [
        { label: "Platform", value: "Android & iOS" },
        { label: "Teknologi", value: "React Native" },
        { label: "Halaman", value: "Hingga 5 layar" },
        { label: "Konten", value: "Statis (dikelola manual)" },
        { label: "Login pengguna", value: "Tidak termasuk" },
        { label: "Push notifikasi", value: "Dasar" },
        { label: "Sumber kode", value: "Termasuk" },
      ],
      includes: [
        "Aplikasi Android & iOS siap rilis",
        "Desain sesuai identitas brand",
        "Profil & informasi bisnis",
        "Konten statis (katalog/info)",
        "Pendampingan publikasi ke store",
        "Sumber kode (source code) diserahkan",
      ],
      limits: [
        "Belum termasuk login/akun pengguna",
        "Belum termasuk transaksi/pembayaran dalam aplikasi",
        "Belum termasuk dashboard admin kelola konten",
        "Maksimal 5 layar",
        "Biaya akun developer store ditanggung Anda",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "mobile-profesional",
      name: "Aplikasi Mobile Profesional",
      tagline: "Katalog dinamis, pesanan, & akun pengguna.",
      price: 7500000,
      originalPrice: 11000000,
      badge: "Paling Populer",
      highlight: true,
      soldOut: false,
      delivery: "18–25 hari kerja",
      features: [
        { title: "Semua fitur Mobile Basic", description: "Sudah termasuk." },
        { title: "Katalog produk dinamis", description: "Kategori, pencarian, & detail produk." },
        { title: "Keranjang & pengajuan pesanan", description: "Alur pesan hingga konfirmasi." },
        { title: "Akun & login pengguna", description: "Riwayat pesanan & profil pengguna." },
        { title: "Dashboard admin kelola konten", description: "Update produk & konten sendiri." },
        { title: "Push notifikasi lebih lengkap", description: "Pemberitahuan promo & pesanan." },
        { title: "Integrasi WhatsApp", description: "Checkout & chat langsung dari aplikasi." },
        { title: "Analitik penggunaan dasar", description: "Pantau aktivitas pengguna." },
      ],
      specs: [
        { label: "Platform", value: "Android & iOS" },
        { label: "Teknologi", value: "React Native + Firebase" },
        { label: "Halaman", value: "Hingga 12 layar" },
        { label: "Konten", value: "Dinamis (via dashboard)" },
        { label: "Login pengguna", value: "Termasuk" },
        { label: "Push notifikasi", value: "Lengkap" },
        { label: "Sumber kode", value: "Termasuk" },
      ],
      includes: [
        "Semua isi paket Basic",
        "Katalog produk dinamis + pencarian",
        "Keranjang & pengajuan pesanan",
        "Akun pengguna & riwayat pesanan",
        "Dashboard admin untuk kelola konten",
        "Push notifikasi & integrasi WhatsApp",
        "Sumber kode (source code) diserahkan",
      ],
      limits: [
        "Pembayaran online (payment gateway) belum termasuk — konfirmasi manual",
        "Belum termasuk integrasi sistem internal pihak ketiga",
        "Maksimal 12 layar",
        "Biaya akun developer store ditanggung Anda",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "mobile-custom",
      name: "Aplikasi Mobile Custom",
      tagline: "Integrasi sistem, pembayaran online, & fitur khusus.",
      price: 18000000,
      originalPrice: 28000000,
      highlight: false,
      soldOut: false,
      delivery: "30–45 hari kerja",
      features: [
        { title: "Semua fitur Mobile Profesional", description: "Sudah termasuk." },
        { title: "Pembayaran online (payment gateway)", description: "Midtrans / Xendit / sejenis." },
        { title: "Integrasi sistem internal", description: "Hubungkan dengan ERP/POS/API yang ada." },
        { title: "Fitur custom sesuai kebutuhan", description: "Booking, poin loyalitas, dsb." },
        { title: "Multi-bahasa & multi-role", description: "Audiens luas & hak akses berbeda." },
        { title: "Laporan & analitik lanjutan", description: "Insight bisnis lebih dalam." },
        { title: "Keamanan & optimasi performa", description: "Pengerasan keamanan + tuning." },
        { title: "Prioritas pengerjaan", description: "Dikerjakan lebih dahulu." },
      ],
      specs: [
        { label: "Platform", value: "Android & iOS" },
        { label: "Teknologi", value: "React Native + backend API" },
        { label: "Halaman", value: "Tanpa batas praktis" },
        { label: "Konten", value: "Dinamis + fitur custom" },
        { label: "Login & role", value: "Termasuk (multi-role)" },
        { label: "Pembayaran", value: "Online (payment gateway)" },
        { label: "Integrasi", value: "API/ERP/POS pihak ketiga" },
      ],
      includes: [
        "Semua isi paket Profesional",
        "Integrasi payment gateway (pembayaran online)",
        "Integrasi sistem internal (API/ERP/POS)",
        "Fitur custom sesuai kebutuhan bisnis",
        "Multi-bahasa & multi-role pengguna",
        "Laporan & analitik lanjutan",
        "Prioritas pengerjaan & pendampingan",
      ],
      limits: [
        "Biaya payment gateway & layanan pihak ketiga ditanggung Anda",
        "Detail cakupan disesuaikan saat konsultasi",
        "Ketergantungan pada ketersediaan API pihak ketiga",
        "Fitur di luar cakupan aplikasi mobile dibahas terpisah",
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
  console.log(`  2. Buka /produk → kartu "Mulai Rp 3.500.000" + badge "3 paket".`);
  console.log(`  3. Buka /produk/${PRODUCT_SLUG} → 3 kartu paket + alur + catatan.`);
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
