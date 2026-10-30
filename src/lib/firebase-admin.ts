import "server-only";
import {
  getApps,
  initializeApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// `.trim()` penting: key sering tersalin dengan spasi/newline di awal-akhir
// (mis. dari dashboard env), yang membuat parsing sertifikat gagal.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
).trim();

/**
 * Mode emulator KHUSUS test/E2E. Sengaja opt-in lewat env terpisah agar
 * deployment produksi tidak pernah jatuh ke emulator hanya karena salah set
 * `FIRESTORE_EMULATOR_HOST`.
 */
const useEmulator =
  process.env.ADMIN_USE_FIREBASE_EMULATOR === "1" &&
  Boolean(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST,
  );
const emulatorProjectId =
  projectId || process.env.GCLOUD_PROJECT || "lktech-emulator";

/**
 * Apakah kredensial Admin SDK tersedia. Di mode emulator, project id saja
 * cukup karena Firebase Admin SDK otomatis memakai host emulator dari env.
 * Bila tidak, route API admin akan mengembalikan error yang jelas (bukan crash)
 * dan fitur pengelolaan lead dinonaktifkan.
 */
export const isAdminConfigured =
  useEmulator || Boolean(projectId && clientEmail && privateKey);

function getAdminApp(): App | null {
  if (!isAdminConfigured) return null;
  if (getApps().length) return getApps()[0];

  if (useEmulator) {
    return initializeApp({ projectId: emulatorProjectId });
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

/**
 * Firestore admin (server-side, bypass security rules).
 * Mengembalikan `null` bila Admin SDK belum dikonfigurasi.
 *
 * `ignoreUndefinedProperties: true` sebagai jaring pengaman: bila suatu saat ada
 * field bernilai `undefined` lolos ke operasi tulis (lihat
 * `firestore-sanitize-pure`), Firestore mengabaikannya alih-alih menggagalkan
 * SELURUH transaksi. Sanitasi eksplisit di batas tulis tetap menjadi cara utama.
 *
 * `settings()` hanya boleh dipanggil sebelum instance Firestore "dimulai", jadi
 * dikonfigurasi sekali per instance (dilacak lewat WeakSet).
 */
const configuredAdminDbs = new WeakSet<Firestore>();

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  if (!configuredAdminDbs.has(db)) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (err) {
      // Instance sudah "started" (mis. hot-reload dev): settings tak bisa diubah
      // lagi. Sanitasi eksplisit di batas tulis tetap menjadi pertahanan utama.
      console.warn("[firebase-admin] settings Firestore tidak dapat diterapkan:", err);
    }
    configuredAdminDbs.add(db);
  }
  return db;
}

/**
 * Firebase Auth admin untuk memverifikasi ID token.
 * Mengembalikan `null` bila Admin SDK belum dikonfigurasi.
 */
export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  return getAuth(app);
}
