import {
  GoogleAuthProvider,
  connectAuthEmulator,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFirebaseApp, isFirebaseAuthEmulatorEnabled } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

/** Mendapatkan instance Firebase Auth (client). Null bila belum dikonfigurasi. */
export function getClientAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  if (isFirebaseAuthEmulatorEnabled && !auth.emulatorConfig) {
    const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_KEY;
    if (!host || !apiKey || apiKey !== process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      throw new Error("Konfigurasi Firebase Auth Emulator tidak valid.");
    }
    connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
  }
  if (
    isFirebaseAuthEmulatorEnabled &&
    !auth.emulatorConfig?.host.includes("127.0.0.1") &&
    !auth.emulatorConfig?.host.includes("localhost")
  ) {
    throw new Error("E2E Auth wajib memakai emulator pada loopback lokal.");
  }
  return auth;
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
  if (isFirebaseAuthEmulatorEnabled) {
    provider.addScope("email");
    provider.addScope("profile");
  }
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
