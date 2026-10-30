/**
 * Utilitas MURNI untuk membersihkan nilai sebelum ditulis ke Firestore.
 *
 * **Kenapa ada:** Firestore Admin SDK MENOLAK nilai `undefined` di dalam field
 * (error "Cannot use \"undefined\" as a Firestore value"). Ini bukan sekadar
 * nilai kosong yang diabaikan — seluruh operasi tulis/transaksi gagal. Karena
 * normalisasi dokumen menghasilkan objek dengan kunci opsional bernilai
 * `undefined`, menyebar objek itu kembali ke `tx.update()` mematikan alur
 * (mis. penandaan lunas & kedaluwarsa order).
 *
 * **Aturan:**
 * - Kunci objek bernilai `undefined` dibuang (bukan diubah menjadi `null`).
 * - Elemen array bernilai `undefined` dibuang.
 * - Objek non-plain (mis. `FieldValue.delete()`, `Timestamp`, `Date`) dikembalikan
 *   apa adanya agar sentinel Firestore tidak rusak.
 *
 * File ini bebas impor runtime supaya dapat diuji Node tanpa alias resolver.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Mengembalikan salinan `value` tanpa nilai `undefined` (rekursif). */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const entry of value) {
      const cleaned = stripUndefined(entry);
      if (cleaned !== undefined) out.push(cleaned);
    }
    return out as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = stripUndefined(entry);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out as unknown as T;
  }
  return value;
}