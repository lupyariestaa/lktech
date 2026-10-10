/**
 * Utilitas waktu MURNI untuk order (OR-B1) — bebas impor runtime (hanya dipakai
 * dari `@/lib/order-types`), sehingga dapat diuji Node tanpa resolver alias.
 */

/**
 * Paksa nilai waktu apa pun (ISO string, Date, Firestore Timestamp, epoch) menjadi
 * string ISO yang konsisten. Nilai tak dikenali → `""`.
 *
 * Berguna untuk dokumen order lama yang mungkin menyimpan `Timestamp`/`Date`
 * (bukan string ISO), sehingga urutan & cursor tetap konsisten.
 */
export function coerceISODate(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? v : new Date(t).toISOString();
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? "" : v.toISOString();
  }
  if (typeof v === "object") {
    const obj = v as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof obj.toDate === "function") {
      try {
        const d = obj.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : "";
      } catch {
        return "";
      }
    }
    const seconds =
      typeof obj.seconds === "number"
        ? obj.seconds
        : typeof obj._seconds === "number"
          ? obj._seconds
          : undefined;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString();
    }
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v).toISOString();
  }
  return "";
}
