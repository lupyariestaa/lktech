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
  title: "Platform Membership & E-Commerce Y&H Printing",
  client: "Y&H Printing",
  category: "Web App",
  serviceSlug: "pembuatan-website",
  year: 2026,
  summary:
    "Web app terintegrasi untuk keanggotaan B2B percetakan — pemesanan berdiskon otomatis, verifikasi transfer, invoice PDF, pelacakan logistik, hingga undian loyalti berkala.",
  cover: "default",
  accent: "from-[#004EDF] to-[#4D82EC]",
  tags: ["Web App", "E-Commerce", "Membership", "Percetakan", "Firebase"],
  challenge:
    "Pengelolaan transaksi reseller percetakan sebelumnya dilakukan manual lewat pesan instan, memicu antrean pesanan, risiko kekeliruan pengecekan mutasi rekening, dan status produksi yang sulit dipantau. Perhitungan diskon paket member serta penyelenggaraan program reward undian tahunan juga belum terotomasi secara transparan dan aman.",
  solution:
    "Membangun sistem web app terpadu dengan pembagian role bertingkat (Member, Admin, Master Admin). Dilengkapi pemesanan produk multi-varian berdiskon otomatis hingga 50%, unggah & kurasi bukti transfer via Cloudinary, penerbitan invoice PDF instan, alur logistik pengiriman paket dengan nomor resi, serta engine undian berkala ber-audit trail. Seluruh alur dirancang agar reseller bisa memesan mandiri tanpa antre.",
  results: [
    "Transaksi reseller beralih dari manual menjadi terotomasi penuh",
    "Verifikasi bukti transfer & penerbitan invoice PDF berjalan tersentralisasi",
    "Diskon eksklusif paket membership hingga 50% teraplikasi otomatis saat checkout",
    "Pelacakan status pesanan & nomor resi kurir transparan secara real-time",
    "Campaign loyalti & pengundian pemenang berjalan adil dan terverifikasi",
  ],
  metrics: [
    { label: "Waktu respon API", value: "< 150 ms" },
    { label: "Efisiensi proses order", value: "+60%" },
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
      "Harganya bersahabat banget buat reseller, proses transaksinya serba otomatis lewat website.",
    author: "Siti Rahma",
    role: "Reseller Percetakan, Bandung",
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
