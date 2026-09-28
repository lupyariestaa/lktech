/**
 * Tautan "lewati ke konten utama" untuk pengguna keyboard/screen reader.
 * Tersembunyi secara visual, muncul saat menerima fokus.
 */
export function SkipLink() {
  return (
    <a
      href="#konten"
      className="sr-only-focusable fixed top-3 left-3 z-[10001] rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30"
    >
      Lewati ke konten utama
    </a>
  );
}
