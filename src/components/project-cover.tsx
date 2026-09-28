import { cn } from "@/lib/utils";

/**
 * Cover visual proyek — placeholder berbasis gradient + pola.
 * Tidak bergantung pada file gambar sehingga ringan, cepat, dan siap
 * diganti dengan gambar asli (Cloudinary) di tahap berikutnya.
 */
export function ProjectCover({
  name,
  accent,
  label,
  className,
}: {
  /** Kunci tema pola (mis. "kopi", "edu", "ritel"). */
  name: string;
  /** Gradient tailwind, mis. "from-[#004EDF] to-[#4D82EC]". */
  accent: string;
  /** Label kategori yang ditampilkan sebagai chip. */
  label?: string;
  className?: string;
}) {
  // Variasi posisi blob berdasarkan nama agar tiap cover terasa berbeda.
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bx = 20 + (seed % 50);
  const by = 25 + ((seed * 7) % 45);

  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gradient-to-br",
        accent,
        className,
      )}
    >
      {/* Pola grid halus */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      {/* Blob dekoratif */}
      <div
        className="absolute h-40 w-40 rounded-full bg-white/25 blur-3xl"
        style={{ left: `${bx}%`, top: `${by}%` }}
      />
      <div className="absolute -right-8 -bottom-10 h-44 w-44 rounded-full bg-black/10 blur-2xl" />

      {/* Mockup abstrak */}
      <div className="absolute inset-x-6 bottom-0 top-10 rounded-t-2xl border border-white/25 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-white/20 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-white/70" />
          <span className="h-2 w-2 rounded-full bg-white/50" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
        </div>
        <div className="space-y-2.5 p-3">
          <div className="h-3 w-1/3 rounded-full bg-white/50" />
          <div className="h-14 rounded-lg bg-white/20" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 rounded-md bg-white/15" />
            <div className="h-8 rounded-md bg-white/15" />
            <div className="h-8 rounded-md bg-white/15" />
          </div>
        </div>
      </div>

      {label && (
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-secondary shadow-sm backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}
