/**
 * Seed satu produk: "Paket Website Sekolah & Instansi" (3 varian) ke Firestore.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product-sekolah.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/paket-website-sekolah-instansi). Aman diulang.
 *
 * Produk multi-varian 3 paket (Basic / Profesional / Custom) untuk pembuatan
 * WEBSITE SEKOLAH / YAYASAN / INSTANSI — profil lembaga, berita, PPDB/agenda,
 * galeri, dsb. Target klien yang disebut di identitas perusahaan (sekolah,
 * yayasan, instansi) tetapi belum punya paket produk.
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

const PRODUCT_SLUG = "paket-website-sekolah-instansi";

const product = {
  slug: PRODUCT_SLUG,
  name: "Paket Website Sekolah & Instansi",
  tagline:
    "Website resmi sekolah, yayasan, atau instansi — profil lembaga, berita, PPDB, & galeri kegiatan.",
  description: [
    "Website resmi sekolah, yayasan, atau instansi adalah wajah lembaga Anda di dunia digital sekaligus sumber informasi terpercaya bagi siswa, orang tua, dan masyarakat. LKTech membuatkan website lembaga yang profesional dan siap pakai — Anda cukup memilih paket, mengirimkan data lembaga serta referensi desain, dan kami mengerjakannya untuk Anda.",
    "",
    "Lengkap dengan halaman profil lembaga, berita & pengumuman, agenda kegiatan, galeri, informasi PPDB (penerimaan peserta didik baru), hingga data guru/staf. Cocok untuk sekolah, madrasah, yayasan, pondok pesantren, maupun instansi pemerintahan dan komunitas.",
    "",
    "Pilih dari tiga paket sesuai kebutuhan: Basic untuk tampil resmi online dengan cepat, Profesional untuk lembaga yang butuh berita, PPDB, & dashboard kelola konten, dan Custom untuk kebutuhan paling lengkap seperti multi-bahasa, portal siswa, atau integrasi sistem. Berbeda dari layanan custom, produk ini bersifat terima jadi — namun tetap disesuaikan dengan identitas lembaga Anda.",
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
  delivery: "5–30 hari kerja",
  process: [
    {
      step: "1",
      title: "Pilih paket & checkout",
      description:
        "Pilih paket sesuai kebutuhan lembaga, lalu checkout melalui WhatsApp.",
    },
    {
      step: "2",
      title: "Kirim data & referensi",
      description:
        "Anda mengirimkan data lembaga (profil, logo, berita, kontak, jadwal/agenda) serta referensi desain melalui WhatsApp.",
    },
    {
      step: "3",
      title: "Kami kerjakan",
      description:
        "Tim LKTech membangun website lembaga Anda sesuai paket yang dipilih.",
    },
    {
      step: "4",
      title: "Website siap & revisi",
      description:
        "Website diserahkan & siap online; revisi minor gratis selama permintaan masih wajar.",
    },
  ],
  notes: [
    "Data lembaga (profil, visi & misi, logo, berita, data guru/staf, kontak) & referensi desain ditagih melalui WhatsApp setelah checkout — bukan diisi di website.",
    "Produk ini bersifat terima jadi: permintaan teknologi, framework, atau fitur di luar paket tidak dapat dikustom (beda dengan Layanan custom). Silakan konsultasi untuk paket yang disesuaikan.",
    "Domain & hosting gratis berlaku sesuai durasi paket; perpanjangan setelahnya menjadi tanggungan Anda.",
    "Pengisian data awal (berita, galeri, dsb.) dibantu sebatas template; penambahan konten rutin selanjutnya dapat dikelola mandiri melalui dashboard (paket Profesional ke atas).",
    "Revisi minor gratis selama permintaan masih wajar. Revisi di luar cakupan paket dibahas terpisah.",
    "Waktu pengerjaan dihitung setelah semua data & referensi lengkap diterima.",
  ],
  variants: [
    {
      slug: "sekolah-basic",
      name: "Website Sekolah Basic",
      tagline: "Tampil resmi online dengan cepat & profesional.",
      price: 1500000,
      originalPrice: 2500000,
      highlight: false,
      soldOut: false,
      delivery: "5–7 hari kerja",
      features: [
        { title: "Domain gratis 1 tahun", description: "Sudah termasuk aktivasi." },
        { title: "Hosting gratis 1 bulan", description: "Langsung online." },
        { title: "Profil & halaman inti", description: "Beranda, profil, kontak." },
        { title: "Desain resmi & terpercaya", description: "Kesan profesional lembaga." },
        { title: "100% responsive", description: "Optimal di HP, tablet, & desktop." },
        { title: "SEO dasar", description: "Meta & struktur halaman yang rapi." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 bulan" },
        { label: "Halaman", value: "1–4 halaman" },
        { label: "Berita/Pengumuman", value: "Tidak termasuk" },
        { label: "Dashboard", value: "Tidak ada" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Website lembaga siap online",
        "Halaman: beranda, profil, kontak",
        "Desain sesuai referensi yang dikirim",
        "Personalisasi data lembaga (logo, profil, kontak)",
        "Aktivasi domain & hosting awal",
      ],
      limits: [
        "Tidak termasuk modul berita/pengumuman",
        "Tidak termasuk halaman PPDB",
        "Tidak termasuk dashboard kelola konten",
        "Maksimal 4 halaman",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "sekolah-profesional",
      name: "Website Sekolah Profesional",
      tagline: "Berita, PPDB, galeri, & dashboard kelola konten.",
      price: 3000000,
      originalPrice: 4800000,
      badge: "Paling Populer",
      highlight: true,
      soldOut: false,
      delivery: "10–14 hari kerja",
      features: [
        { title: "Semua fitur Website Sekolah Basic", description: "Sudah termasuk." },
        { title: "Hosting gratis 1 tahun", description: "Lebih hemat." },
        { title: "Berita & pengumuman", description: "Portal informasi lembaga." },
        { title: "Halaman PPDB", description: "Penerimaan peserta didik baru / pendaftaran." },
        { title: "Galeri kegiatan", description: "Dokumentasi acara & prestasi." },
        { title: "Data guru & staf", description: "Profil tenaga pendidik." },
        { title: "Dashboard kelola konten", description: "Update berita & konten sendiri." },
        { title: "SEO lebih lengkap", description: "Optimasi lebih menyeluruh." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Halaman", value: "Multi-halaman" },
        { label: "Berita/Pengumuman", value: "Termasuk" },
        { label: "Dashboard", value: "Basic (kelola konten)" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Basic",
        "Modul berita & pengumuman",
        "Halaman PPDB / pendaftaran",
        "Galeri kegiatan & data guru/staf",
        "Dashboard admin untuk kelola konten",
        "Optimasi SEO lebih lengkap",
      ],
      limits: [
        "Dashboard basic (fitur terbatas)",
        "Belum termasuk portal siswa / nilai online",
        "Belum termasuk pembayaran online (PPDB)",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "sekolah-custom",
      name: "Website Sekolah Custom",
      tagline: "Portal siswa, multi-bahasa, & integrasi sistem.",
      price: 5500000,
      originalPrice: 8500000,
      highlight: false,
      soldOut: false,
      delivery: "20–30 hari kerja",
      features: [
        { title: "Semua fitur Website Sekolah Profesional", description: "Sudah termasuk." },
        { title: "Multi-bahasa", description: "Jangkau audiens lebih luas." },
        { title: "Portal siswa / e-learning ringan", description: "Akses khusus siswa." },
        { title: "PPDB online + pembayaran", description: "Pendaftaran & bayar langsung online." },
        { title: "Integrasi sistem internal", description: "Hubungkan dengan sistem yang ada." },
        { title: "Desain custom lebih bebas", description: "Sesuai identitas lembaga." },
        { title: "Laporan & statistik", description: "Data pendaftar/kunjungan." },
        { title: "Prioritas pengerjaan", description: "Dikerjakan lebih dahulu." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Halaman", value: "Multi-halaman (lebih banyak)" },
        { label: "Dashboard", value: "Proper / lengkap" },
        { label: "Portal siswa", value: "Termasuk (ringan)" },
        { label: "Multi-bahasa", value: "Ya" },
        { label: "Pembayaran", value: "Online (payment gateway)" },
      ],
      includes: [
        "Semua isi paket Profesional",
        "Multi-bahasa",
        "Portal siswa / e-learning ringan",
        "PPDB online + pembayaran online",
        "Integrasi sistem internal",
        "Laporan & statistik",
        "Prioritas pengerjaan",
      ],
      limits: [
        "Biaya payment gateway & layanan pihak ketiga ditanggung Anda",
        "Detail cakupan disesuaikan saat konsultasi",
        "Portal siswa bersifat ringan (bukan sistem akademik penuh)",
        "Fitur di luar cakupan website lembaga dibahas terpisah",
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
  console.log(`  2. Buka /produk → kartu "Mulai Rp 1.500.000" + badge "3 paket".`);
  console.log(`  3. Buka /produk/${PRODUCT_SLUG} → 3 kartu paket + alur + catatan.`);
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
