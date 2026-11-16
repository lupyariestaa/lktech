/**
 * Tambahkan produk tunggal "Undangan Pernikahan Digital" ke Firestore.
 * Jalankan dari root proyek: node scripts/seed-product-undangan-pernikahan.mjs
 * Membaca Firebase Admin credentials dari .env.local.
 *
 * Skrip hanya membuat dokumen products/undangan-pernikahan-digital dan menolak
 * menimpa dokumen yang sudah ada; tidak mengubah pesanan/produk lain.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(ROOT, ".env.local");

try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
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
} catch {
  console.error(`Tidak menemukan .env.local di ${envPath}`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Kredensial Firebase Admin tidak lengkap. Periksa FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, dan FIREBASE_ADMIN_PRIVATE_KEY di .env.local.",
  );
  process.exit(1);
}

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

const product = {
  slug: "undangan-pernikahan-digital",
  name: "Undangan Pernikahan Digital",
  tagline: "Undangan pernikahan online yang dibuat sesuai data dan pilihan template Anda.",
  description: [
    "Undangan pernikahan digital personal dengan satu harga Rp100.000. Setelah pembayaran terverifikasi, hubungi kami melalui WhatsApp untuk menerima tautan demo template yang tersedia.",
    "",
    "Pilih template dari demo, lalu kirim data mempelai dan acara melalui WhatsApp. Undangan akan kami siapkan secara manual dan tautan hasilnya dikirim setelah selesai.",
    "",
    "Produk ini bukan unduhan instan. Tidak ada varian template saat checkout; pilihan template dilakukan setelah Anda menerima tautan demo.",
  ].join("\n"),
  category: "template",
  price: 100000,
  cover: "default",
  gallery: [],
  badge: "Rp100.000",
  features: [
    { title: "Satu harga", description: "Rp100.000 tanpa varian atau biaya pilihan template saat checkout." },
    { title: "Pilih setelah melihat demo", description: "Kami kirim tautan demo template melalui WhatsApp setelah pembayaran terverifikasi." },
    { title: "Dibuat sesuai data Anda", description: "Kirim data mempelai dan acara melalui WhatsApp; undangan diproses manual." },
    { title: "Tautan undangan online", description: "Tautan hasil undangan dikirim kepada Anda setelah selesai diproses." },
  ],
  specs: [
    { label: "Harga", value: "Rp100.000" },
    { label: "Pilihan template", value: "Setelah menerima tautan demo" },
    { label: "Pengumpulan data", value: "WhatsApp" },
    { label: "Proses", value: "Manual setelah pembayaran terverifikasi" },
    { label: "Hasil", value: "Tautan undangan digital" },
  ],
  tools: [],
  includes: [
    "Satu undangan pernikahan digital",
    "Pilihan satu template dari demo yang tersedia",
    "Pemrosesan data mempelai dan acara",
    "Tautan undangan setelah selesai dibuat",
  ],
  delivery: "Diproses manual setelah pembayaran dikonfirmasi dan data diterima",
  process: [
    { step: "1", title: "Beli undangan", description: "Checkout produk seharga Rp100.000 dan selesaikan pembayaran melalui Mayar." },
    { step: "2", title: "Minta demo template", description: "Setelah pembayaran terverifikasi, buka Akun → Pesanan dan tekan tombol WhatsApp untuk meminta tautan demo." },
    { step: "3", title: "Pilih template & kirim data", description: "Pilih salah satu demo, lalu kirim data mempelai dan acara melalui WhatsApp." },
    { step: "4", title: "Terima tautan undangan", description: "Kami memprosesnya secara manual dan mengirim tautan undangan setelah selesai." },
  ],
  notes: [
    "Tidak ada pemilihan varian/template pada saat checkout.",
    "Tautan demo dikirim secara manual setelah pembayaran terverifikasi.",
    "Data mempelai dan acara dikirim melalui WhatsApp.",
    "Proses pembuatan dilakukan manual; produk bukan unduhan instan.",
  ],
  variants: [],
  soldOut: false,
  featured: true,
  active: true,
  reviewsEnabled: false,
};

const ref = db.collection("products").doc(product.slug);
const existed = (await ref.get()).exists;
if (existed) {
  console.error(
    `Dokumen products/${product.slug} sudah ada. Tidak ada data yang diubah; periksa dokumen tersebut dan lakukan edit melalui /admin/products bila perlu.`,
  );
  process.exit(1);
}
await ref.create({ ...product, updatedAtISO: new Date().toISOString(), updatedBy: "seed-script" });

console.log(`Produk dibuat: ${product.name}`);
console.log(`  Dokumen: products/${product.slug}`);
console.log(`  Harga: Rp${product.price.toLocaleString("id-ID")}`);
console.log("  Pastikan nomor WhatsApp situs benar dan unggah gambar cover sebelum promosi.");
