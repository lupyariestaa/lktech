/**
 * Seed satu produk: "Paket Website Marketplace" (3 varian) ke Firestore.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product-marketplace.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/paket-website-marketplace). Aman diulang.
 *
 * Produk ini mengikuti pola produk sejenis (multi-varian 3 paket:
 * Basic / Profesional / Custom), dengan cakupan LEBIH BESAR karena sistem
 * toko online jauh lebih kompleks (katalog, keranjang, checkout, varian,
 * promo, pembayaran, laporan penjualan). Ditujukan untuk SATU bisnis
 * (single-seller) — bukan platform multi-vendor.
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

const PRODUCT_SLUG = "paket-website-marketplace";

const product = {
  slug: PRODUCT_SLUG,
  name: "Paket Website Marketplace",
  tagline:
    "Toko online lengkap untuk satu bisnis — katalog, keranjang, checkout, sampai dashboard kelola produk & pesanan.",
  description: [
    "Website marketplace (toko online) adalah toko digital milik satu bisnis yang bisa menjual banyak produk secara online. LKTech membuatkan toko online yang lengkap dan siap pakai — mulai dari katalog produk, keranjang, checkout, sampai dashboard untuk mengelola seluruh produk & pesanan Anda sendiri.",
    "",
    "Cocok untuk satu orang, satu bisnis, atau satu perusahaan yang ingin menjual banyak produk dalam satu toko. Semua dikelola dari satu dashboard — Anda sebagai pemilik memiliki kendali penuh atas produk, harga, pesanan, dan pesan pelanggan.",
    "",
    "Pilih dari tiga paket sesuai skala toko Anda: Basic untuk mulai berjualan online dengan alur jual-beli dasar, Profesional untuk toko yang butuh varian produk, promo, & pengalaman belanja lengkap, dan Custom untuk kebutuhan paling lengkap seperti pembayaran online, laporan penjualan, dan fitur khusus lainnya. Berbeda dari layanan custom, produk ini bersifat terima jadi (seperti template premium) — namun dengan personalisasi brand, kategori, dan data sesuai identitas toko Anda.",
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
  tools: ["Next.js", "Tailwind CSS", "TypeScript", "Firebase", "Vercel"],
  includes: [],
  delivery: "7–30 hari kerja",
  process: [
    {
      step: "1",
      title: "Pilih paket & checkout",
      description:
        "Pilih paket sesuai skala toko, lalu checkout melalui WhatsApp.",
    },
    {
      step: "2",
      title: "Kirim data & referensi",
      description:
        "Anda mengirimkan data toko (brand, kategori produk, informasi kontak) serta referensi desain melalui WhatsApp.",
    },
    {
      step: "3",
      title: "Kami kerjakan",
      description:
        "Tim LKTech membangun toko online Anda sesuai paket yang dipilih — dari katalog hingga dashboard.",
    },
    {
      step: "4",
      title: "Uji & serah terima",
      description:
        "Kami uji alur belanja, lalu menyerahkan toko; revisi minor gratis selama permintaan masih wajar.",
    },
  ],
  notes: [
    "Data toko (brand, kategori produk, informasi kontak, dsb.) & referensi desain ditagih melalui WhatsApp setelah checkout — bukan diisi di website.",
    "Produk ini bersifat terima jadi: permintaan teknologi, framework, atau fitur di luar paket tidak dapat dikustom (beda dengan Layanan custom). Silakan konsultasi untuk paket yang disesuaikan.",
    "Biaya pihak ketiga (payment gateway, domain premium, kuota SMS/email, hosting skala besar) di luar paket menjadi tanggungan Anda.",
    "Revisi minor gratis selama permintaan masih wajar. Revisi di luar cakupan paket dibahas terpisah.",
    "Domain & hosting gratis berlaku sesuai durasi paket; perpanjangan setelahnya menjadi tanggungan Anda.",
    "Waktu pengerjaan dihitung setelah semua data & referensi lengkap diterima.",
  ],
  variants: [
    {
      slug: "marketplace-basic",
      name: "Toko Online Basic",
      tagline: "Mulai berjualan online: katalog, keranjang, & kelola produk.",
      price: 2500000,
      originalPrice: 4000000,
      highlight: false,
      soldOut: false,
      delivery: "7–14 hari kerja",
      features: [
        { title: "Katalog produk & kategori", description: "Tampilan produk rapi & mudah dicari." },
        { title: "Pencarian & filter produk", description: "Pembeli menemukan produk dengan cepat." },
        { title: "Keranjang & checkout", description: "Alur beli dasar hingga konfirmasi." },
        { title: "Dashboard kelola produk", description: "Tambah, edit, & hapus produk sendiri." },
        { title: "Halaman detail produk", description: "Gambar, harga, & deskripsi produk." },
        { title: "100% responsive", description: "Optimal di HP, tablet, & desktop." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 bulan" },
        { label: "Pemilik toko", value: "1 bisnis (single-seller)" },
        { label: "Jumlah produk", value: "Hingga ~50 produk" },
        { label: "Dashboard", value: "Admin dasar" },
        { label: "Foto produk", value: "Sampai 5 foto/produk" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Toko online siap online",
        "Katalog produk + kategori & pencarian",
        "Keranjang & alur checkout dasar",
        "Dashboard admin untuk kelola produk",
        "Personalisasi brand (logo, warna, identitas)",
        "Aktivasi domain & hosting awal",
      ],
      limits: [
        "Satu toko / satu pemilik (bukan multi-penjual)",
        "Belum termasuk varian produk (ukuran/warna)",
        "Belum termasuk pembayaran online (konfirmasi via WhatsApp)",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "marketplace-profesional",
      name: "Toko Online Profesional",
      tagline: "Varian produk, promo, & pengalaman belanja lengkap.",
      price: 5500000,
      originalPrice: 8500000,
      badge: "Paling Populer",
      highlight: true,
      soldOut: false,
      delivery: "14–21 hari kerja",
      features: [
        { title: "Semua fitur Toko Online Basic", description: "Sudah termasuk." },
        { title: "Varian produk", description: "Ukuran, warna, atau paket dalam satu produk." },
        { title: "Kelola pesanan & status", description: "Diproses, dikirim, selesai, dibatalkan." },
        { title: "Kupon & diskon", description: "Kode promo untuk mendongkrak penjualan." },
        { title: "Ulasan & rating produk", description: "Membangun kepercayaan pembeli." },
        { title: "Wishlist / favorit", description: "Pembeli menyimpan produk favorit." },
        { title: "Riwayat pesanan pembeli", description: "Pembeli melacak pesanan mereka." },
        { title: "Ongkir & metode pengiriman", description: "Atur biaya kirim per wilayah." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Pemilik toko", value: "1 bisnis (single-seller)" },
        { label: "Jumlah produk", value: "Hingga ~500 produk" },
        { label: "Dashboard", value: "Admin lengkap" },
        { label: "Foto produk", value: "Sampai 10 foto/produk" },
        { label: "Pembayaran", value: "Transfer / konfirmasi manual" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Basic",
        "Dukungan varian produk (ukuran/warna/paket)",
        "Manajemen pesanan dengan status lengkap",
        "Sistem kupon & diskon",
        "Ulasan, rating, & wishlist",
        "Riwayat pesanan pembeli",
        "Pengaturan ongkir & metode pengiriman",
      ],
      limits: [
        "Satu toko / satu pemilik (bukan multi-penjual)",
        "Pembayaran online (payment gateway) belum termasuk — konfirmasi manual",
        "Hingga ~500 produk",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "marketplace-custom",
      name: "Toko Online Custom",
      tagline: "Skala besar + pembayaran online & laporan penjualan.",
      price: 12000000,
      originalPrice: 18000000,
      highlight: false,
      soldOut: false,
      delivery: "21–45 hari kerja",
      features: [
        { title: "Semua fitur Toko Online Profesional", description: "Sudah termasuk." },
        { title: "Pembayaran online (payment gateway)", description: "Midtrans / Xendit / sejenis." },
        { title: "Laporan & analitik penjualan", description: "Insight performa toko Anda." },
        { title: "Multi-kategori & multi-bahasa", description: "Skala besar & audiens luas." },
        { title: "Kupon, promo, & flash sale", description: "Alat promosi untuk mendongkrak penjualan." },
        { title: "Manajemen stok & inventaris", description: "Pantau stok tiap produk." },
        { title: "Notifikasi email / WhatsApp", description: "Pemberitahuan pesanan otomatis." },
        { title: "Integrasi ekspedisi / kurir", description: "Cek ongkir otomatis (bila tersedia API-nya)." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Pemilik toko", value: "1 bisnis (single-seller)" },
        { label: "Jumlah produk", value: "Tanpa batas praktis" },
        { label: "Dashboard", value: "Admin + laporan" },
        { label: "Foto produk", value: "Tanpa batas" },
        { label: "Pembayaran", value: "Online (payment gateway)" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Profesional",
        "Integrasi payment gateway (pembayaran online)",
        "Dashboard laporan & analitik penjualan",
        "Manajemen stok & inventaris",
        "Modul promo: kupon, voucher, flash sale",
        "Notifikasi email / WhatsApp otomatis",
        "Integrasi ekspedisi (bila tersedia)",
        "Prioritas pengerjaan",
      ],
      limits: [
        "Satu toko / satu pemilik (bukan multi-penjual)",
        "Biaya payment gateway (per transaksi) ditanggung pemilik toko",
        "Detail cakupan disesuaikan saat konsultasi",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Fitur di luar cakupan toko online dibahas terpisah",
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
  console.log(`  2. Buka /produk → kartu "Mulai Rp 2.500.000" + badge "3 paket".`);
  console.log(`  3. Buka /produk/${PRODUCT_SLUG} → 3 kartu paket + alur + catatan.`);
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
