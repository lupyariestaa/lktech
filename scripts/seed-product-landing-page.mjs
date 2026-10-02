/**
 * Seed satu produk: "Paket Landing Page" (3 varian) ke Firestore.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-product-landing-page.mjs
 *
 * Script membaca kredensial Firebase Admin dari `.env.local`
 * (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).
 *
 * Sifat: IDEMPOTEN — menjalankan ulang akan MENIMPA dokumen produk yang sama
 * (products/paket-landing-page). Aman diulang.
 *
 * Produk multi-varian 3 paket (Basic / Profesional / Custom) untuk pembuatan
 * LANDING PAGE (satu halaman fokus konversi) — produk murah & cepat sebagai
 * pintu masuk (funnel) bagi UMKM, individu, & pelaku usaha online.
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

const PRODUCT_SLUG = "paket-landing-page";

const product = {
  slug: PRODUCT_SLUG,
  name: "Paket Landing Page",
  tagline:
    "Landing page fokus konversi yang cepat jadi — cocok untuk promosi produk, jasa, event, atau iklan.",
  description: [
    "Landing page adalah satu halaman yang dirancang khusus untuk mengarahkan pengunjung melakukan satu aksi: menghubungi Anda, mengisi formulir, atau memesan produk. LKTech membuatkan landing page profesional yang cepat jadi — Anda cukup memilih paket, mengirimkan data & referensi, dan kami mengerjakannya untuk Anda.",
    "",
    "Cocok untuk promosi produk, jasa, event, peluncuran bisnis baru, atau halaman tujuan iklan (ads). Landing page yang baik membuat calon pelanggan langsung paham penawaran Anda dan tergerak untuk menghubungi atau membeli.",
    "",
    "Pilih dari tiga paket sesuai kebutuhan: Basic untuk mulai cepat dengan satu halaman sederhana, Profesional untuk landing page yang butuh formulir, SEO, & integrasi WhatsApp, dan Custom untuk kebutuhan paling lengkap seperti multi-bahasa, integrasi pembayaran, atau desain khusus. Berbeda dari layanan custom, produk ini bersifat terima jadi — namun tetap disesuaikan dengan identitas brand Anda.",
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
  delivery: "1–7 hari kerja",
  process: [
    {
      step: "1",
      title: "Pilih paket & checkout",
      description:
        "Pilih paket sesuai kebutuhan, lalu checkout melalui WhatsApp.",
    },
    {
      step: "2",
      title: "Kirim data & referensi",
      description:
        "Anda mengirimkan data bisnis (logo, teks, produk/layanan) serta referensi desain melalui WhatsApp.",
    },
    {
      step: "3",
      title: "Kami kerjakan",
      description:
        "Tim LKTech membuat landing page Anda dalam 1–7 hari kerja.",
    },
    {
      step: "4",
      title: "Halaman siap & revisi",
      description:
        "Landing page diserahkan & siap online; revisi minor gratis selama permintaan masih wajar.",
    },
  ],
  notes: [
    "Data bisnis (logo, teks/copy, produk/layanan, kontak) & referensi desain ditagih melalui WhatsApp setelah checkout — bukan diisi di website.",
    "Produk ini bersifat terima jadi: permintaan teknologi, framework, atau fitur di luar paket tidak dapat dikustom (beda dengan Layanan custom). Silakan konsultasi untuk paket yang disesuaikan.",
    "Domain & hosting gratis berlaku sesuai durasi paket; perpanjangan setelahnya menjadi tanggungan Anda.",
    "Revisi minor gratis selama permintaan masih wajar. Revisi di luar cakupan paket dibahas terpisah.",
    "Waktu pengerjaan dihitung setelah semua data & referensi lengkap diterima.",
  ],
  variants: [
    {
      slug: "landing-page-basic",
      name: "Landing Page Basic",
      tagline: "Satu halaman fokus konversi, cepat jadi.",
      price: 500000,
      originalPrice: 900000,
      highlight: false,
      soldOut: false,
      delivery: "1–3 hari kerja",
      features: [
        { title: "Domain gratis 1 tahun", description: "Sudah termasuk aktivasi." },
        { title: "Hosting gratis 1 bulan", description: "Langsung online." },
        { title: "Desain modern & fokus", description: "Terarah pada satu aksi." },
        { title: "100% responsive", description: "Optimal di HP, tablet, & desktop." },
        { title: "Section lengkap", description: "Hero, keunggulan, penawaran, kontak." },
        { title: "Tombol WhatsApp", description: "Pengunjung bisa langsung chat." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 bulan" },
        { label: "Halaman", value: "1 halaman" },
        { label: "Formulir", value: "Tidak termasuk" },
        { label: "SEO", value: "Dasar" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Landing page siap online",
        "Desain sesuai referensi yang dikirim",
        "Section: hero, keunggulan, penawaran, kontak",
        "Tombol WhatsApp untuk konversi",
        "Aktivasi domain & hosting awal",
      ],
      limits: [
        "Tidak termasuk formulir/lead form",
        "Tidak termasuk integrasi pembayaran",
        "Maksimal 1 halaman",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "landing-page-profesional",
      name: "Landing Page Profesional",
      tagline: "Formulir, SEO, & integrasi WhatsApp lengkap.",
      price: 1200000,
      originalPrice: 2000000,
      badge: "Paling Populer",
      highlight: true,
      soldOut: false,
      delivery: "3–5 hari kerja",
      features: [
        { title: "Semua fitur Landing Page Basic", description: "Sudah termasuk." },
        { title: "Hosting gratis 1 tahun", description: "Lebih hemat." },
        { title: "Formulir/lead (data masuk)", description: "Kumpulkan kontak calon pelanggan." },
        { title: "SEO lebih lengkap", description: "Optimasi lebih menyeluruh." },
        { title: "Integrasi WhatsApp & email", description: "Notifikasi tiap ada lead masuk." },
        { title: "Galeri / katalog ringkas", description: "Tampilkan produk atau karya." },
        { title: "Testimoni & FAQ", description: "Membangun kepercayaan pengunjung." },
        { title: "Integrasi analytics", description: "Pantau performa halaman." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Halaman", value: "1 halaman (section lengkap)" },
        { label: "Formulir", value: "Termasuk (lead form)" },
        { label: "SEO", value: "Lengkap" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Basic",
        "Formulir/lead form + notifikasi email/WhatsApp",
        "Optimasi SEO lebih lengkap",
        "Galeri/katalog ringkas",
        "Section testimoni & FAQ",
        "Integrasi analytics (mis. Google Analytics)",
      ],
      limits: [
        "Tidak termasuk integrasi pembayaran online",
        "Maksimal 1 halaman (banyak section, tetap satu halaman)",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Revisi minor (selama wajar)",
      ],
    },
    {
      slug: "landing-page-custom",
      name: "Landing Page Custom",
      tagline: "Multi-bahasa, pembayaran, & desain khusus.",
      price: 2500000,
      originalPrice: 4000000,
      highlight: false,
      soldOut: false,
      delivery: "5–7 hari kerja",
      features: [
        { title: "Semua fitur Landing Page Profesional", description: "Sudah termasuk." },
        { title: "Desain custom lebih bebas", description: "Sesuai identitas brand Anda." },
        { title: "Multi-bahasa", description: "Jangkau audiens lebih luas." },
        { title: "Integrasi pembayaran", description: "Terima pembayaran langsung dari halaman." },
        { title: "Animasi & interaksi premium", description: "Tampilan lebih hidup & meyakinkan." },
        { title: "A/B section / varian konten", description: "Uji penawaran berbeda." },
        { title: "Integrasi CRM / Google Sheets", description: "Lead otomatis masuk ke sistem Anda." },
        { title: "Prioritas pengerjaan", description: "Dikerjakan lebih dahulu." },
      ],
      specs: [
        { label: "Domain", value: "Gratis 1 tahun" },
        { label: "Hosting", value: "Gratis 1 tahun" },
        { label: "Halaman", value: "1–3 halaman terkait" },
        { label: "Formulir", value: "Termasuk + integrasi CRM" },
        { label: "Pembayaran", value: "Integrasi payment gateway" },
        { label: "Multi-bahasa", value: "Ya" },
        { label: "Responsive", value: "Ya" },
      ],
      includes: [
        "Semua isi paket Profesional",
        "Desain custom sesuai brand",
        "Multi-bahasa",
        "Integrasi pembayaran (payment gateway)",
        "Animasi & interaksi premium",
        "Integrasi CRM / Google Sheets",
        "Prioritas pengerjaan",
      ],
      limits: [
        "Biaya payment gateway & layanan pihak ketiga ditanggung Anda",
        "Detail cakupan disesuaikan saat konsultasi",
        "Tidak termasuk penulisan/penyuntingan konten & copywriting",
        "Fitur di luar cakupan landing page dibahas terpisah",
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
  console.log(`  2. Buka /produk → kartu "Mulai Rp 500.000" + badge "3 paket".`);
  console.log(`  3. Buka /produk/${PRODUCT_SLUG} → 3 kartu paket + alur + catatan.`);
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
