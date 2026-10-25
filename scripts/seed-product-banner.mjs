import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const split = trimmed.indexOf("=");
  if (split < 0) continue;
  const key = trimmed.slice(0, split).trim();
  const value = trimmed.slice(split + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  if (!(key in process.env)) process.env[key] = value;
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
if (!projectId || !clientEmail || !privateKey) throw new Error("Kredensial Firebase Admin tidak lengkap.");

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);
const slug = "cetak-banner-gratis-desain";
const ref = db.collection("products").doc(slug);
const existing = await ref.get();
if (existing.exists) throw new Error(`Produk ${slug} sudah ada; tidak ditimpa.`);

await ref.create({
  slug,
  name: "Cetak Banner Gratis Desain",
  tagline: "Cetak banner dengan bantuan desain gratis.",
  description: "Produk percetakan banner. Hubungi admin untuk memastikan spesifikasi dan ketersediaan sebelum produk diaktifkan.",
  category: "percetakan",
  price: 0,
  cover: "default",
  gallery: [],
  features: [],
  specs: [],
  tools: [],
  includes: [],
  process: [],
  notes: ["Kirim brief desain melalui WhatsApp setelah checkout tersedia."],
  variants: [{
    slug: "flexi-240-gsm",
    name: "Flexi 240 GSM",
    price: 0,
    highlight: false,
    soldOut: false,
    features: [],
    specs: [],
    includes: [],
    limits: [],
    printPricing: { method: "area", ratePerM2: 0 },
  }],
  printConfig: {
    minWidthM: 0,
    minHeightM: 0,
    maxWidthM: 0,
    maxHeightM: 0,
    minPricePerUnit: 0,
    finishingOptions: [],
  },
  soldOut: false,
  featured: false,
  active: false,
  updatedAtISO: new Date().toISOString(),
  updatedBy: "seed-script",
});

console.log(`Produk ${slug} dibuat nonaktif di Firestore ${projectId}. Isi batas ukuran dan tarif vendor sebelum mengaktifkan.`);
