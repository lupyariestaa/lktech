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

export async function signInWithGoogle() {
  const auth = getClientAuth();
  if (!auth) throw new Error("Firebase belum dikonfigurasi.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
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
