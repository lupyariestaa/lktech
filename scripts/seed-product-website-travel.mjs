/**
 * Seed produk source code Website Travel Mobil ke Firestore.
 *
 * Jalankan dari root LKTech:
 *   node scripts/seed-product-website-travel.mjs
 *
 * Membaca Firebase Admin dari .env.local. Idempotent: menjalankan ulang akan
 * mengganti dokumen products/website-travel-rental-mobil.
 *
 * PENTING: URL ZIP di bawah masih placeholder. Produk dibuat aktif sesuai
 * permintaan, tetapi ganti URL di /admin/products sebelum pelanggan mengunduh.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "✗ Kredensial Firebase Admin tidak lengkap. Pastikan .env.local berisi:\n" +
      "  FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY",
  );
  process.exit(1);
}

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

const PRODUCT_SLUG = "website-travel-rental-mobil";
const DOWNLOAD_PLACEHOLDER = "https://example.com/website-travel-source-code.zip";

const product = {
  slug: PRODUCT_SLUG,
  name: "Website Travel & Rental Mobil Siap Pakai",
  tagline:
    "Source code full-stack untuk bisnis rental mobil, travel antarkota, dan paket wisata.",
  description: [
    "Website Travel & Rental Mobil Siap Pakai adalah source code aplikasi full-stack untuk bisnis perjalanan yang ingin memiliki website pemesanan dan dashboard operasional sendiri.",
    "",
    "Satu aplikasi mencakup katalog rental mobil, travel antarkota dengan jadwal dan kursi, serta paket wisata. Pelanggan mengisi booking dan diarahkan ke WhatsApp untuk konfirmasi manual; admin dapat mengelola armada, booking, jadwal, wisata, cabang, driver, konten, dan laporan melalui dashboard.",
    "",
    "Produk yang dijual adalah source code dan panduan setup. Pembeli mengunduh berkas setelah pembayaran, lalu mengatur environment, database, dan deployment sendiri. Tidak termasuk layanan deploy atau hosting dari LKTech.",
  ].join("\n"),
  category: "software",
  price: 499000,
  cover: "default",
  gallery: [],
  badge: "Source Code Siap Pakai",
  features: [
    {
      title: "Tiga layanan perjalanan",
      description: "Rental mobil, travel antarkota, serta paket wisata dalam satu website.",
    },
    {
      title: "Booking via WhatsApp",
      description: "Alur pemesanan mengirim detail booking ke WhatsApp untuk konfirmasi manual.",
    },
    {
      title: "Dashboard operasional",
      description: "Kelola booking, armada, jadwal, wisata, cabang, driver, konten, dan laporan.",
    },
    {
      title: "Validasi ketersediaan",
      description: "Pengecekan server-side untuk armada, kursi perjalanan, dan kuota wisata.",
    },
    {
      title: "Source code full-stack",
      description: "Aplikasi Next.js, TypeScript, Prisma, dan PostgreSQL beserta panduan setup.",
    },
  ],
  specs: [
    { label: "Framework", value: "Next.js 15 + React 19" },
    { label: "Bahasa", value: "TypeScript (strict)" },
    { label: "Database", value: "PostgreSQL + Prisma 6" },
    { label: "Autentikasi", value: "Auth.js / NextAuth" },
    { label: "Format", value: "Source code (.zip)" },
    { label: "Pengiriman", value: "Unduhan digital" },
  ],
  tools: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Auth.js"],
  includes: [
    "Source code aplikasi website travel full-stack",
    "Website publik: rental mobil, travel antarkota, paket wisata, blog, dan halaman informasi",
    "Dashboard admin untuk operasional dan pengelolaan konten",
    "Panduan setup dan konfigurasi project",
    "Bantuan setup dasar melalui chat LKTech",
  ],
  delivery: "Unduhan otomatis setelah pembayaran terkonfirmasi",
  process: [
    {
      step: "1",
      title: "Checkout & bayar",
      description: "Selesaikan checkout dan pembayaran secara online.",
    },
    {
      step: "2",
      title: "Pembayaran dikonfirmasi",
      description: "Setelah pembayaran terkonfirmasi, tautan unduhan tersedia melalui pesanan/email.",
    },
    {
      step: "3",
      title: "Unduh source code",
      description: "Unduh arsip source code dan panduan setup ke perangkat Anda.",
    },
    {
      step: "4",
      title: "Setup & deploy sendiri",
      description: "Ikuti panduan untuk menyiapkan database, environment, dan hosting pilihan Anda.",
    },
  ],
  notes: [
    "Yang dijual adalah source code website; LKTech tidak melakukan deployment atau menyediakan hosting/domain.",
    "Pembeli menyiapkan sendiri layanan pihak ketiga yang dibutuhkan, seperti database PostgreSQL, hosting, domain, dan kredensial integrasi.",
    "Termasuk bantuan setup dasar melalui chat, terbatas pada panduan instalasi project; bukan jasa konfigurasi server, migrasi data, atau deployment.",
    "Website contoh berisi konten/dataset demo yang perlu disesuaikan sebelum digunakan untuk bisnis nyata.",
    "URL file unduhan pada listing ini masih placeholder dan wajib diganti oleh admin sebelum proses unduhan pelanggan digunakan.",
  ],
  variants: [],
  soldOut: false,
  featured: true,
  active: true,
  downloadable: {
    enabled: true,
    files: [{ name: "Website-Travel-Rental-Mobil-Source-Code.zip", url: DOWNLOAD_PLACEHOLDER }],
    note: "URL berkas saat ini masih placeholder. Hubungi admin bila tautan unduhan belum diperbarui.",
  },
};

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)]),
    );
  }
  return value;
}

async function main() {
  const ref = db.collection("products").doc(PRODUCT_SLUG);
  const existed = (await ref.get()).exists;
  await ref.set(
    {
      ...stripUndefined(product),
      updatedAtISO: new Date().toISOString(),
      updatedBy: "seed-script",
    },
    { merge: false },
  );

  console.log(`✓ Produk "${product.name}" ${existed ? "DIPERBARUI" : "DIBUAT"} di Firestore.`);
  console.log(`  • Koleksi : products/${PRODUCT_SLUG}`);
  console.log(`  • Harga   : Rp ${product.price.toLocaleString("id-ID")}`);
  console.log(`  • Project : ${projectId}`);
  console.warn("⚠ URL unduhan masih placeholder. Ganti di /admin/products sebelum unduhan pelanggan digunakan.");
}

main().catch((err) => {
  console.error("✗ Gagal seed produk:", err);
  process.exit(1);
});
