import {
  ChevronDown,
  Download,
  File,
  History,
  Laptop,
  Monitor,
  ServerOff,
  ShieldCheck,
  Upload,
} from "lucide-react";

const POINTS = [
  {
    icon: Laptop,
    title: "Diproses di perangkat",
    description:
      "Gambar, PDF, dan teks dibaca langsung oleh browser Anda, bukan oleh server kami.",
  },
  {
    icon: History,
    title: "Tanpa riwayat berkas",
    description:
      "Kami tidak menyimpan berkas atau hasil proses. Menutup halaman berarti membersihkan sesi.",
  },
  {
    icon: Upload,
    title: "Tanpa unggahan",
    description:
      "Tidak ada request berisi berkas. Yang tersimpan di perangkat hanya preferensi tool (slug).",
  },
] as const;

/**
 * Bukti privasi landing: stat, diagram alur berkas, dan disclosure teknis.
 * Tidak memakai klaim absolut seperti “100% aman”.
 */
export function ToolsPrivacyProof() {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-secondary">
            Berkas tidak meninggalkan perangkat
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Bukan janji kosong — ini alur yang bisa Anda periksa sendiri.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4">
        <p className="text-4xl font-bold tracking-tight text-emerald-700">
          0 byte
        </p>
        <p className="mt-1 text-xs font-medium text-muted">
          berkas dikirim ke server saat Anda memproses gambar, PDF, atau teks.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-3 text-center">
        <div className="flex flex-col items-center gap-1">
          <File className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-secondary">Berkas</span>
        </div>
        <span className="text-slate-300" aria-hidden="true">
          →
        </span>
        <div className="flex flex-col items-center gap-1">
          <Monitor className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-primary">Browser</span>
        </div>
        <span className="text-slate-300" aria-hidden="true">
          →
        </span>
        <div className="flex flex-col items-center gap-1">
          <Download className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-emerald-700">Hasil</span>
        </div>
      </div>

      <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
        <ServerOff className="h-3 w-3" aria-hidden="true" />
        Server tidak terlibat
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {POINTS.map((point) => (
          <li key={point.title} className="flex gap-2.5">
            <point.icon
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-bold text-secondary">{point.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                {point.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <details className="group mt-auto pt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
          Bagaimana ini bisa bekerja?
          <ChevronDown
            className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-2 space-y-2 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-muted">
          <p>
            Tool memakai fitur bawaan browser seperti Canvas API, FileReader,
            dan pdf.js. Berkas dibaca langsung di perangkat, lalu hasilnya dibuat
            di memori browser.
          </p>
          <p>
            Ingin memverifikasi? Buka DevTools → Network saat memproses gambar;
            tidak ada request berisi berkas. Preferensi lokal (tool terakhir dan
            favorit) hanya menyimpan slug tool di localStorage perangkat Anda.
          </p>
        </div>
      </details>
    </div>
  );
}
