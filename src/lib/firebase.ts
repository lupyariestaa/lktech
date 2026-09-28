import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Apakah kredensial Firebase lengkap tersedia.
 * Dipakai untuk fallback (mis. kirim lewat WhatsApp) saat belum dikonfigurasi.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

/**
 * Mendapatkan instance Firebase App (singleton).
 * Mengembalikan `null` bila env belum dikonfigurasi, agar aplikasi
 * tidak crash dan bisa memakai fallback.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Mendapatkan instance Firestore (singleton).
 * Mengembalikan `null` bila Firebase belum dikonfigurasi.
 */
export function getDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFirestore(app);
}
