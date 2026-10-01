import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Halaman publik yang bisa menampilkan media. Setiap mutasi media memanggil
 * invalidasi ini agar perubahan segera tampil (bukan menunggu cache 60s).
 *
 * MED-13: sebelumnya hanya `/portofolio` yang di-revalidate.
 */
export const MEDIA_DEPENDENT_PATHS = [
  "/",
  "/portofolio",
  "/produk",
  "/blog",
  "/layanan",
] as const;

/** Invalidasi semua halaman yang bergantung pada media. */
export function revalidateMediaPaths(): void {
  for (const p of MEDIA_DEPENDENT_PATHS) {
    try {
      revalidatePath(p);
    } catch {
      /* abaikan: revalidate bisa gagal di luar request context */
    }
  }
}
