/** Menyaring error Firebase Auth menjadi pesan berbahasa Indonesia. */
export function normalizeAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  if (code.includes("popup-closed-by-user")) return "Jendela login ditutup.";
  if (code.includes("popup-blocked"))
    return "Popup diblokir browser. Izinkan popup lalu coba lagi.";
  if (code.includes("cancelled-popup-request"))
    return "Login dibatalkan. Coba lagi.";
  if (code.includes("account-exists-with-different-credential"))
    return "Email ini sudah terdaftar dengan metode login lain.";
  if (code.includes("network-request-failed"))
    return "Koneksi bermasalah. Periksa internet Anda.";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Email atau password salah.";
  if (code.includes("user-not-found")) return "Akun tidak ditemukan.";
  if (code.includes("email-already-in-use"))
    return "Email sudah terdaftar. Silakan masuk.";
  if (code.includes("weak-password")) return "Password minimal 6 karakter.";
  if (code.includes("invalid-email")) return "Format email tidak valid.";
  if (code.includes("too-many-requests"))
    return "Terlalu banyak percobaan. Coba lagi nanti.";
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan. Coba lagi.";
}
