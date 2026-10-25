import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBannerProduct } from "./banner-placeholder-data.mjs";

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

await ref.create(buildBannerProduct(new Date().toISOString()));

console.log(`Produk banner ${slug} dibuat aktif di Firestore ${projectId} menggunakan konfigurasi katalog yang disetujui.`);
