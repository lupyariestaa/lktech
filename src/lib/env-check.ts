import "server-only";

/**
 * Validasi environment "FAIL LOUD" saat startup (Tema 4.5, lanjutan `XL-5`).
 *
 * Tujuan: memberi sinyal JELAS di log server ketika konfigurasi produksi
 * belum lengkap — jauh sebelum pengguna terkena error. Tidak pernah crash:
 * hanya mencatat ringkasan status (aman, tanpa membocorkan nilai rahasia).
 *
 * Dipanggil sekali dari `instrumentation.ts` (register) di runtime Node.
 */

type EnvCheck = {
  key: string;
  /** Wajib untuk fungsi inti (tanpa ini, fitur utama nonaktif). */
  required: boolean;
  /** Keterangan singkat bila kosong. */
  note: string;
};

function isSet(key: string): boolean {
  return Boolean((process.env[key] ?? "").trim());
}

/**
 * Jalankan pemeriksaan env & catat ringkasannya. Mengembalikan daftar env yang
 * KOSONG (untuk keperluan pengujian/log). Tidak melempar.
 */
export function checkEnv(): { missingRequired: string[]; missingOptional: string[] } {
  const checks: EnvCheck[] = [
    // ===== Wajib (inti situs) =====
    { key: "NEXT_PUBLIC_FIREBASE_API_KEY", required: true, note: "auth klien" },
    { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", required: true, note: "auth klien" },
    { key: "FIREBASE_ADMIN_PROJECT_ID", required: true, note: "data server" },
    { key: "FIREBASE_ADMIN_CLIENT_EMAIL", required: true, note: "data server" },
    { key: "FIREBASE_ADMIN_PRIVATE_KEY", required: true, note: "data server" },
    { key: "ADMIN_EMAILS", required: true, note: "akses dashboard admin" },
    // ===== Opsional (fitur tertentu) =====
    { key: "MAYAR_API_KEY", required: false, note: "pembayaran online (fallback WhatsApp)" },
    { key: "DOWNLOAD_TOKEN_SECRET", required: false, note: "unduhan digital" },
    { key: "RESEND_API_KEY", required: false, note: "email transaksional" },
    { key: "CRON_SECRET", required: false, note: "cron kedaluwarsa & pengingat" },
    { key: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", required: false, note: "upload media" },
    { key: "CLOUDINARY_API_KEY", required: false, note: "upload media" },
    { key: "CLOUDINARY_API_SECRET", required: false, note: "upload media" },
    { key: "UPSTASH_REDIS_REST_URL", required: false, note: "rate-limit terdistribusi" },
    { key: "UPSTASH_REDIS_REST_TOKEN", required: false, note: "rate-limit terdistribusi" },
  ];

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const c of checks) {
    if (isSet(c.key)) continue;
    if (c.required) missingRequired.push(`${c.key} (${c.note})`);
    else missingOptional.push(`${c.key} (${c.note})`);
  }

  return { missingRequired, missingOptional };
}

/** Catat hasil pemeriksaan env ke log (fail-loud, tanpa membocorkan nilai). */
export function logEnvHealth(): void {
  try {
    const { missingRequired, missingOptional } = checkEnv();
    const isProd = process.env.NODE_ENV === "production";

    if (missingRequired.length > 0) {
      console.error(
        `[env] ⚠️ KONFIGURASI WAJIB BELUM LENGKAP (${missingRequired.length}): ${missingRequired.join(
          ", ",
        )}${isProd ? " — fitur inti akan gagal!" : " (mode dev)"}`,
      );
    } else {
      console.log("[env] ✅ Konfigurasi wajib lengkap.");
    }

    if (missingOptional.length > 0) {
      console.warn(
        `[env] ℹ️ Fitur opsional nonaktif (env kosong): ${missingOptional.join(", ")}`,
      );
    }
  } catch (err) {
    console.error("[env] gagal memeriksa konfigurasi:", err);
  }
}
