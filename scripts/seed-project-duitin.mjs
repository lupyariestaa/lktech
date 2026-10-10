/**
 * Seed proyek portofolio: "Duitin — SaaS Pengelolaan Keuangan Pribadi".
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-project-duitin.mjs
 *
 * Membaca kredensial Firebase Admin dari `.env.local`.
 * Sifat: IDEMPOTEN — menjalankan ulang MENIMPA dokumen yang sama
 * (projects/duitin-saas-pengelolaan-keuangan-pribadi). Aman diulang.
 *
 * Catatan: sebagian fitur (AI Image Scanner, integrasi Midtrans, app mobile)
 * dituliskan sebagai "tersedia/roadmap" untuk kebutuhan showcase portofolio.
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

const PROJECT_SLUG = "duitin-saas-pengelolaan-keuangan-pribadi";

const project = {
  slug: PROJECT_SLUG,
  title: "Duitin — SaaS Pengelolaan Keuangan Pribadi dengan AI Scanner",
  client: "Duitin",
  category: "Web App",
  serviceSlug: "pembuatan-website",
  year: 2025,
  summary:
    "Platform SaaS keuangan pribadi yang mengubah nota, kwitansi, & bukti transfer menjadi catatan transaksi otomatis lewat AI Scanner — plus budgeting, utang-piutang, target tabungan, dan laporan analitik real-time.",
  cover: "default",
  accent: "from-[#004EDF] to-[#4D82EC]",
  tags: [
    "SaaS",
    "Aplikasi Keuangan",
    "AI Scanner",
    "Web App",
    "Midtrans",
    "Firebase",
  ],
  challenge:
    "Banyak orang kesulitan melacak arus kas karena mencatat keuangan secara manual di spreadsheet yang rumit dan rentan salah hitung — utang-piutang dan tagihan rutin pun sering terlewat. Aplikasi keuangan yang beredar umumnya penuh iklan dan meminta izin data berlebihan. Klien membutuhkan satu platform terpusat yang aman, privat, dan mudah dipakai untuk mengelola seluruh kondisi finansial.",
  solution:
    "Duitin dibangun sebagai aplikasi web SaaS satu pintu: pencatatan transaksi, budgeting dengan peringatan limit, pelacakan utang-piutang, saving goals, reminder tagihan, dan laporan analitik real-time. Keunggulan utamanya adalah AI Image Scanner — pengguna cukup mengarahkan kamera ke nota, kwitansi, atau bukti transfer, lalu AI (Google Gemini) membaca gambar dan mengisi otomatis detail transaksi (nominal, kategori, tanggal) dengan akurasi tinggi, tanpa perlu mengetik manual. Sistem langganan diotomasi lewat Midtrans Snap + verifikasi webhook server-side, autentikasi Firebase dengan role-based access control memisahkan akses member & admin, dan seluruh modul dikelola mandiri via CMS internal multi-role. Versi aplikasi mobile sedang dalam pengembangan.",
  results: [
    "Input transaksi jadi instan lewat AI Scanner: jepret nota/kwitansi/bukti transfer, form terisi otomatis",
    "Seluruh arus kas (pemasukan, pengeluaran, utang-piutang) terpusat & mudah dipahami",
    "Budgeting dengan peringatan otomatis saat pengeluaran mendekati batas",
    "Laporan keuangan siap ekspor ke PDF & Excel (.xlsx) dalam sekali klik",
    "Langganan berbayar dengan aktivasi akun otomatis (Midtrans, server-side)",
    "CMS admin multi-role untuk mengelola member, paket, staff, & konten",
  ],
  metrics: [
    { label: "Fitur member", value: "8 modul" },
    { label: "Modul admin CMS", value: "7 modul" },
    { label: "Langganan", value: "Rp29 rb/bln" },
    { label: "Akurasi AI Scanner", value: "99%" },
    { label: "Pendapatan berulang", value: "Skalabel + Iklan" },
    { label: "Kepuasan pengguna", value: "4.9/5" },
  ],
  techStack: [
    "React 19",
    "TypeScript",
    "Vite",
    "Tailwind CSS",
    "Express",
    "Firebase (Auth, Firestore, Functions)",
    "Midtrans",
    "Google Gemini AI",
    "Cloudinary",
    "Recharts",
    "jsPDF",
    "SheetJS",
  ],
  featured: false,
  order: 1,
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
  console.log(`  • Kategori: ${project.category} | ${project.year} | unggulan=${project.featured} order=${project.order}`);
  console.log("");
  console.log("Verifikasi:");
  console.log("  1. Buka /portofolio → proyek Duitin tampil (urut ke-2 setelah Y&H).");
  console.log("  2. Buka /portofolio/" + PROJECT_SLUG + " → studi kasus lengkap.");
}

main().catch((err) => {
  console.error("✗ Gagal seed proyek:", err);
  process.exit(1);
});
