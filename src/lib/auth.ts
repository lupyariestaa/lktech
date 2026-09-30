import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

/** Mendapatkan instance Firebase Auth (client). Null bila belum dikonfigurasi. */
export function getClientAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

export function onAuthChange(cb: (user: User | null) => void) {
  const auth = getClientAuth();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(emailHint?: string) {
  const auth = getClientAuth();
  if (!auth) throw new Error("Firebase belum dikonfigurasi.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
    // Mengarahkan pemilih akun Google ke email tertentu (bila diisi manual).
    ...(emailHint?.trim() ? { login_hint: emailHint.trim() } : {}),
  });
  return signInWithPopup(auth, provider);
}

/**
 * URL halaman akun Google untuk mengelola / memulihkan akses.
 *
 * Google tidak menyediakan halaman "reset password" publik yang bisa
 * dikunjungi langsung (reset hanya lewat alur login Google). Karena itu kita
 * arahkan pengguna ke halaman akun Google untuk pemulihan. Situs ini sengaja
 * TIDAK mengelola reset password sendiri.
 */
export function googleResetPasswordUrl(): string {
  return "https://accounts.google.com/signin/recovery";
}

export async function signOutUser() {
  const auth = getClientAuth();
  if (!auth) return;
  await signOut(auth);
}

/** Mengambil ID token terbaru untuk dipakai pada request ke API admin. */
export async function getIdToken(): Promise<string | null> {
  const auth = getClientAuth();
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}
