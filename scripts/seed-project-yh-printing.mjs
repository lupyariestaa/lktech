/**
 * Seed proyek portofolio: "Platform Membership & E-Commerce Y&H Printing".
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-project-yh-printing.mjs
 *
 * Membaca kredensial Firebase Admin dari `.env.local`.
 * Sifat: IDEMPOTEN — menjalankan ulang MENIMPA dokumen yang sama
 * (projects/platform-membership-ecommerce-yh-printing). Aman diulang.
 *
 * Proyek UNGGULAN (featured: true, order: 0) — tampil depan & di beranda.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ */
/* 1. Muat .env.local secara manual                                    */
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
/* 2. Data proyek                                                      */
/* ------------------------------------------------------------------ */
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

const PROJECT_SLUG = "platform-membership-ecommerce-yh-printing";

const project = {
  slug: PROJECT_SLUG,
  title: "Y&H Yudha Member — Platform Membership Anti-Churn untuk Retail Percetakan",
  client: "Y&H Yudha Grafika",
  category: "Web App",
  serviceSlug: "pembuatan-website",
  year: 2026,
  summary:
    "Platform membership B2B yang mengubah pembeli dari Shopee, TikTok, Tokopedia, & Lazada menjadi member berlangganan — mencegah pelanggan pindah toko sekaligus menciptakan pendapatan di muka melalui biaya keanggotaan tahunan.",
  cover: "default",
  accent: "from-[#004EDF] to-[#4D82EC]",
  tags: ["Web App", "Membership", "Retensi Pelanggan", "E-Commerce", "Percetakan", "Firebase"],
  challenge:
    "Y&H Yudha Grafika punya basis pelanggan yang sangat besar dan aktif — tetapi hampir seluruhnya berbelanja lewat marketplace pihak ketiga (Shopee, TikTok, Tokopedia, Lazada). Ini berisiko: pelanggan mudah berpindah ke toko lain karena harga sama-sama terlihat di semua toko, tanpa ada ikatan dengan brand. Perusahaan butuh cara mengikat pelanggan agar tetap setia, sekaligus menciptakan sumber pendapatan yang tidak bergantung pada margin tipis marketplace.",
  solution:
    "Membangun platform membership khusus (Y&H Yudha Member) dengan skema langganan sekali bayar Rp200.000/tahun. Member mendapatkan diskon hingga 50% khusus di website — harga yang tidak tersedia di marketplace — sehingga pelanggan punya alasan kuat untuk loyal dan bertransaksi langsung ke brand. Lewat strategi ini, setiap konversi pelanggan marketplace menjadi member menghasilkan pendapatan di muka bagi perusahaan, sekaligus mencegah churn. Platform dibangun dengan pembagian role bertingkat (Member, Admin, Master Admin), pemesanan multi-varian berdiskon otomatis, verifikasi bukti transfer via Cloudinary, invoice PDF instan, pelacakan logistik ber-nomor resi, dan engine undian loyalti berkala ber-audit trail.",
  results: [
    "Pelanggan dari marketplace terikat sebagai member berlangganan — menekan risiko berpindah toko",
    "Tercipta pendapatan di muka dari biaya keanggotaan tahunan (one-time pay per member)",
    "Diskon member hingga 50% menjadi magnet loyalitas yang tidak tersedia lewat marketplace",
    "Transaksi member beralih dari manual ke website sendiri (lepas dari ketergantungan marketplace)",
    "Verifikasi transfer, invoice PDF, & pelacakan resi berjalan tersentralisasi dan otomatis",
    "Campaign loyalti & pengundian member berjalan adil serta terverifikasi (audit trail)",
  ],
  metrics: [
    { label: "Biaya member / tahun", value: "Rp200 rb" },
    { label: "Diskon khusus member", value: "Hingga 50%" },
    { label: "Potensi pendapatan member", value: "Rp600 jt+" },
    { label: "Waktu respon API", value: "< 150 ms" },
    { label: "Katalog varian SKU", value: "350+" },
    { label: "Modul panel admin", value: "10 modul" },
  ],
  techStack: [
    "React 19",
    "TypeScript",
    "Vite",
    "Tailwind CSS",
    "Express",
    "Node.js",
    "Firebase Admin",
    "Cloudinary",
    "jsPDF",
    "Nodemailer",
  ],
  testimonial: {
    quote:
      "Sejak ada website member, pelanggan marketplace kami jadi punya alasan untuk balik lagi ke toko sendiri — bukan cuma lewat WhatsApp.",
    author: "Pengelola Y&H Yudha Grafika",
    role: "Tim Operasional Y&H Yudha Grafika",
  },
  featured: true,
  order: 0,
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
  console.log(`  • Kategori: ${project.category} | ${project.year} | unggulan=${project.featured}`);
  console.log("");
  console.log("Verifikasi:");
  console.log("  1. Buka /portofolio → proyek Y&H Printing tampil paling depan (tanpa badge 'Contoh').");
  console.log("  2. Buka /portofolio/" + PROJECT_SLUG + " → studi kasus lengkap.");
  console.log("  3. Buka / → tampil di section portfolio beranda (unggulan).");
}

main().catch((err) => {
  console.error("✗ Gagal seed proyek:", err);
  process.exit(1);
});
