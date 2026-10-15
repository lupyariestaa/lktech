import { cn } from "@/lib/utils";

/** Warna sisi TETANGGA yang dileburkan ke dalam section. */
type SeamFrom = "surface" | "white";

const FROM_CLASS: Record<SeamFrom, string> = {
  surface: "from-surface",
  white: "from-white",
};

/**
 * Jahitan lembut di batas antar-section (F2).
 *
 * Ditempatkan DI DALAM section (yang ber-`relative`), menempel ke tepi atas
 * atau bawah, lalu memudar dari warna section **tetangga** ke transparan —
 * sehingga perpindahan warna yang kontras (mis. terang → gelap pada section
 * statistik) tidak "memotong keras".
 *
 * Catatan urutan render: jangan beri `z-index` positif. Letakkan SEBELUM
 * konten di dalam section agar konten tetap tergambar di atasnya (keduanya
 * `z-index: auto` → urutan DOM menentukan).
 */
export function SectionSeam({
  edge,
  from,
  className,
}: {
  /** Tepi section tempat jahitan dipasang. */
  edge: "top" | "bottom";
  /** Warna section tetangga yang dileburkan. */
  from: SeamFrom;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 h-10 opacity-60",
        edge === "top"
          ? "top-0 bg-gradient-to-b"
          : "bottom-0 bg-gradient-to-t",
        FROM_CLASS[from],
        "to-transparent",
        className,
      )}
    />
  );
}
