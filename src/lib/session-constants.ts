/**
 * Konstanta sesi yang aman dipakai di Edge runtime (middleware) maupun server.
 * TIDAK boleh mengimpor firebase-admin / server-only.
 */
export const ADMIN_SESSION_COOKIE = "__session";
