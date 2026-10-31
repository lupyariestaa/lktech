/**
 * Logika MURNI paginasi daftar media (Sprint 10 / ADM-17) — bebas impor runtime
 * agar dapat diuji Node tanpa alias resolver.
 *
 * Latar: `listMedia` membaca dokumen dari Firestore, memfilter/mengurutkan di
 * memori, lalu memotong satu halaman. Fungsi di sini memisahkan perhitungan
 * jendela halaman & penanda batas pemindaian agar perilakunya teruji tanpa
 * Firestore dan UI bisa jujur saat data terpotong.
 */

/** Kunci pengurutan yang dikenali (subset `MediaSortKey`, tanpa impor runtime). */
export type MediaSortKey = "newest" | "oldest" | "title" | "size";

/** Kursor halaman: gabungan `createdAt` + `id`. */
export type MediaCursor = { createdAt: string; id: string };

/** Bentuk minimal item untuk paginasi: butuh id + waktu buat. */
export type PageableMediaItem = {
  id: string;
  createdAt: string | null;
};

/** Hasil pemotongan satu halaman dari daftar yang sudah terfilter & terurut. */
export type MediaPage<T> = {
  items: T[];
  /** Indeks awal halaman pada daftar terfilter (untuk pengujian/telemetri). */
  startIndex: number;
  /** Masih ada item setelah halaman ini. */
  hasMore: boolean;
  /** Item kursor berikutnya (pemanggil yang meng-encode). `null` bila habis. */
  nextCursorItem: MediaCursor | null;
  /**
   * `true` bila pemindaian sumber menyentuh batas keras sehingga daftar yang
   * dipaginasi mungkin BELUM lengkap. Bukan berarti "masih ada halaman".
   */
  truncated: boolean;
};

/**
 * Potong satu halaman dari daftar terfilter.
 *
 * - Kursor `sort === "newest"` dicocokkan pada (createdAt, id) — stabil terhadap
 *   nilai `createdAt` yang identik.
 * - Kursor sortir lain dicocokkan lewat `id` saja (urutan non-waktu tidak unik).
 * - Kursor tak ditemukan → mulai dari awal (aman, tidak kehilangan data baru).
 */
export function paginateMedia<T extends PageableMediaItem>(input: {
  filtered: readonly T[];
  cursor: MediaCursor | null;
  sort: MediaSortKey | string;
  limit: number;
  /** `true` bila seluruh sumber habis dipindai (daftar lengkap). */
  scanExhausted: boolean;
}): MediaPage<T> {
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.floor(input.limit)) : 1;
  const cursor = input.cursor;

  let startIndex = 0;
  if (cursor) {
    if (input.sort === "newest") {
      const idx = input.filtered.findIndex(
        (it) => it.createdAt === cursor.createdAt && it.id === cursor.id,
      );
      startIndex = idx >= 0 ? idx + 1 : 0;
    } else {
      const idx = input.filtered.findIndex((it) => it.id === cursor.id);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }
  }

  const items = input.filtered.slice(startIndex, startIndex + limit);
  const last = items[items.length - 1];
  const hasMore = startIndex + limit < input.filtered.length;

  return {
    items,
    startIndex,
    hasMore,
    nextCursorItem:
      hasMore && last ? { createdAt: last.createdAt ?? "", id: last.id } : null,
    truncated: !input.scanExhausted,
  };
}

/**
 * Apakah pemindaian bertahap menyentuh batas keras.
 * `exhausted = true` berarti seluruh dokumen pada query sudah dipindai (lengkap).
 */
export function isScanTruncated(exhausted: boolean): boolean {
  return !exhausted;
}
