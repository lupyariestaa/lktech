/** Util format tampilan bersama untuk dashboard & halaman publik. */

/** Format angka Rupiah (mis. 1500000 → "Rp1.500.000"). */
export function formatRupiah(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return "Rp" + n.toLocaleString("id-ID");
}

/**
 * Kode pesanan ramah-manusia dari id dokumen (mis. "a1b2c3d4…" → "#A1B2C3D4").
 * 8 karakter pertama uppercase agar mudah dibaca/dikomunikasikan.
 */
export function shortOrderCode(id: string): string {
  return "#" + id.slice(0, 8).toUpperCase();
}

/** Format tanggal-waktu lengkap (mis. "2 Okt 2026, 14.30"). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
