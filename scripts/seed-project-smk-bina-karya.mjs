/**
 * Seed proyek portofolio: "Website Profil SMK Bina Karya Nusantara".
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-project-smk-bina-karya.mjs
 *
 * Membaca kredensial Firebase Admin dari `.env.local`.
 * Sifat: IDEMPOTEN — menjalankan ulang MENIMPA dokumen yang sama. Aman diulang.
 *
 * Catatan: tantangan/solusi/hasil DISUSUN atas permintaan pemilik
 * (data asli "SKIP") agar portofolio lebih menarik. Nama sekolah bersifat
 * fiktif/dummy.
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

const PROJECT_SLUG = "website-profil-smk-bina-karya-nusantara";

const project = {
  slug: PROJECT_SLUG,
  title: "Website Profil SMK Bina Karya Nusantara",
  client: "SMK Bina Karya Nusantara",
  category: "Sekolah & Instansi",
  serviceSlug: "pembuatan-website",
  year: 2026,
  summary:
    "Website profil resmi sekolah dengan 6 program keahlian, fasilitas & galeri, informasi PPDB, berita, dan kontak — dibangun cepat, aman, dan ramah SEO sebagai static site.",
  pages: "14 halaman · 23 URL",
  cover: "default",
  accent: "from-[#004EDF] to-[#4D82EC]",
  tags: ["Website", "Sekolah", "Company Profile", "PPDB", "Responsive", "SEO"],
  challenge:
    "Calon siswa dan orang tua mencari informasi sekolah lewat internet, tetapi SMK Bina Karya Nusantara belum memiliki kanal resmi online. Informasi program keahlian, fasilitas, dan jadwal PPDB tersebar tidak teratur, sehingga calon pendaftar sulit mendapatkan gambaran utuh — dan sekolah kehilangan momentum penerimaan siswa baru.",
  solution:
    "Membangun website profil sekolah yang lengkap dan cepat: 6 program keahlian, halaman fasilitas & galeri, informasi PPDB yang jelas, berita kegiatan, hingga kontak. Dibangun dengan Next.js (App Router) + TypeScript + Tailwind CSS sebagai static site generation (SSG) sehingga halaman termuat instan, aman, dan mudah ditemukan mesin pencari. Seluruh halaman juga responsif sehingga nyaman dibuka dari ponsel.",
  results: [
    "Sekolah punya kanal resmi online 24 jam yang kredibel",
    "Informasi 6 program keahlian & PPDB tersaji rapi dan mudah diakses",
    "Halaman termuat instan berkat static site generation (SSG)",
    "Ramah SEO — struktur & metadata siap ditemukan mesin pencari",
    "Tampilan responsif nyaman di HP, tablet, & desktop",
  ],
  metrics: [
    { label: "Halaman", value: "14 route" },
    { label: "Program keahlian", value: "6 jurusan" },
    { label: "Artikel berita", value: "5 berita" },
    { label: "URL di sitemap", value: "23 URL" },
    { label: "Jenis", value: "SSG (static)" },
    { label: "Responsif", value: "Ya" },
  ],
  techStack: [
    "Next.js",
    "React 19",
    "TypeScript",
    "Tailwind CSS",
    "SSG",
    "Playwright",
    "Netlify",
  ],
  featured: false,
  order: 2,
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
  console.log("  1. Buka /portofolio → proyek SMK tampil urut ke-3.");
  console.log("  2. Buka /portofolio/" + PROJECT_SLUG + " → studi kasus lengkap.");
}

main().catch((err) => {
  console.error("✗ Gagal seed proyek:", err);
  process.exit(1);
});
