import {
  ArrowRight,
  Check,
  FileImage,
  FileText,
  ImageDown,
  Images,
  ShieldCheck,
} from "lucide-react";

/**
 * Mockup workspace untuk hero landing `/tools`.
 *
 * Sepenuhnya CSS/Tailwind — tidak ada gambar, video, atau aset berat. Elemen
 * dekoratif ditandai `aria-hidden` dan disertai deskripsi teks untuk pembaca
 * layar. Ilustrasi ini tidak meniru hasil pemrosesan nyata; label kecil
 * "ilustrasi" ditampilkan agar tidak menyesatkan.
 */
export function ToolsHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <p className="sr-only">
        Ilustrasi antarmuka LKTech Tools: sebuah gambar PNG 4,8 MB dikonversi
        menjadi WebP 812 KB, disertai kartu warna dan PDF. Semua proses
        berlangsung di browser tanpa unggahan berkas.
      </p>

      <div aria-hidden="true" className="relative">
        <div className="absolute -inset-5 rounded-[2.75rem] bg-gradient-to-br from-primary/15 via-white to-emerald-100/60 blur-2xl" />

        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          {/* Bilah browser */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="ml-2 flex-1 truncate rounded-full bg-surface px-3 py-1 text-[10px] font-medium text-slate-400">
              lktech.id/tools/ruang
            </span>
            <span className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary">
              LKTech Tools
            </span>
          </div>

          <div className="relative bg-surface p-4 sm:p-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary">
                    <ImageDown className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-secondary">
                      Gambar ke WebP
                    </p>
                    <p className="text-[10px] text-muted">Diproses lokal</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  <Check className="h-3 w-3" />
                  Selesai
                </span>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-xl border border-slate-100 bg-surface p-2.5">
                  <FileImage className="h-4 w-4 text-slate-400" />
                  <p className="mt-2 truncate text-[10px] font-semibold text-secondary">
                    foto-produk.png
                  </p>
                  <p className="text-[10px] text-muted">4,8 MB</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
                  <ImageDown className="h-4 w-4 text-emerald-600" />
                  <p className="mt-2 truncate text-[10px] font-semibold text-secondary">
                    foto-produk.webp
                  </p>
                  <p className="text-[10px] text-emerald-700">812 KB</p>
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-emerald-500" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-emerald-700">
                  −83% ukuran
                </span>
                <span className="text-muted">1600 × 1200 px</span>
              </div>
            </div>

            {/* Kartu warna mengambang */}
            <div className="absolute -left-5 bottom-14 hidden w-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 sm:block">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-[#2563EB]" />
                <div>
                  <p className="text-[10px] font-bold text-secondary">#2563EB</p>
                  <p className="text-[9px] text-muted">RGB 37 99 235</p>
                </div>
              </div>
              <p className="mt-2 rounded-md bg-surface px-2 py-1 font-mono text-[9px] text-slate-500">
                hsl(221 83% 53%)
              </p>
            </div>

            {/* Kartu PDF mengambang */}
            <div className="absolute -right-4 top-24 hidden w-36 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 md:block">
              <FileText className="h-4 w-4 text-rose-500" />
              <p className="mt-2 text-[10px] font-bold text-secondary">
                laporan.pdf
              </p>
              <p className="text-[9px] text-muted">12 halaman</p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-semibold text-primary">
                <Images className="h-2.5 w-2.5" /> PNG
              </p>
            </div>
          </div>
        </div>

        {/* Pill privasi */}
        <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 shadow-lg shadow-emerald-900/5">
          <ShieldCheck className="h-3.5 w-3.5" />
          0 byte berkas diunggah
        </div>

        <span className="absolute -top-3 right-4 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
          Ilustrasi
        </span>
      </div>
    </div>
  );
}
