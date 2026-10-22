/**
 * Konstanta sesi yang aman dipakai di Edge runtime (middleware) maupun server.
 * TIDAK boleh mengimpor firebase-admin / server-only.
 */

/** Cookie session Firebase (HttpOnly) untuk gate `/admin/*`. */
export const ADMIN_SESSION_COOKIE = "__session";

/**
 * Cookie penanda awal sesi admin (HttpOnly, ditandatangani HMAC).
 *
 * Cookie ini mengikat sesi Firebase ke satu "login window" absolut. Cookie
 * `__session` saja tidak cukup untuk membuka dashboard; penyerang yang menyalin
 * cookie sesi juga harus menyalin cookie ini. Masa berlakunya tidak diperpanjang
 * oleh refresh aktivitas.
 */
export const ADMIN_LOGIN_COOKIE = "__admin_login";

/** Idle timeout admin: sesi mati setelah 60 menit tanpa aktivitas. */
export const ADMIN_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

/** Absolute timeout admin: wajib login ulang setelah 12 jam. */
export const ADMIN_ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/** Interval refresh cookie saat admin aktif (harus < idle timeout). */
export const ADMIN_SESSION_REFRESH_MS = 5 * 60 * 1000;

/** Interval pemeriksaan idle/refresh di klien. */
export const ADMIN_SESSION_TICK_MS = 30 * 1000;

/**
 * Jendela "auth baru" untuk aksi sensitif (backup restore, ubah admin,
 * broadcast, hapus massal). Bila `auth_time` token lebih lama dari ini, klien
 * wajib re-auth Google dan server menolak dengan `code: reauth_required`.
 */
export const ADMIN_REAUTH_WINDOW_MS = 10 * 60 * 1000;
