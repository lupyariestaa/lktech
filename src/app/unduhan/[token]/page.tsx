import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock, Download, FileDown } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { getGrantByToken } from "@/lib/downloads";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unduhan Produk",
  description: "Halaman unduhan produk digital LKTech.",
  robots: { index: false, follow: false },
};

function bytes(n?: number): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const REASON_COPY: Record<string, { title: string; body: string }> = {
  invalid: {
    title: "Tautan tidak valid",
    body: "Tautan unduhan ini tidak valid atau sudah diubah. Periksa kembali tautan dari email Anda.",
  },
  not_found: {
    title: "Tautan tidak ditemukan",
    body: "Kami tidak menemukan data unduhan untuk tautan ini. Pastikan Anda membuka tautan yang benar.",
  },
  expired: {
    title: "Tautan kedaluwarsa",
    body: "Masa berlaku tautan unduhan ini telah berakhir. Hubungi kami bila Anda masih membutuhkan berkasnya.",
  },
  exhausted: {
    title: "Batas unduhan tercapai",
    body: "Jumlah unduhan untuk tautan ini sudah mencapai batas. Hubungi kami untuk bantuan.",
  },
};

export default async function UnduhanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const check = await getGrantByToken(token);

  if (!check.ok) {
    const copy = REASON_COPY[check.reason] ?? REASON_COPY.invalid;
    return (
      <>
        <Navbar />
        <main id="konten" className="mx-auto max-w-xl px-6 py-28 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-secondary">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted">{copy.body}</p>
          <Link
            href="/kontak"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            Hubungi Kami
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const { grant } = check;

  return (
    <>
      <Navbar />
      <main id="konten" className="mx-auto max-w-2xl px-6 py-28">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary">
          <FileDown className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-center text-2xl font-bold text-secondary">
          Unduhan <span className="text-gradient">Produk</span>
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Terima kasih atas pembelian Anda. Unduh berkas di bawah ini.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          Berlaku sampai {formatDateTime(grant.expiresAt)}
          {grant.maxHits > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Dipakai {grant.hits}/{grant.maxHits} unduhan
              </span>
            </>
          )}
        </div>

        {grant.note && (
          <p className="mt-6 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
            {grant.note}
          </p>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {grant.files.map((f, i) => (
            <li
              key={`${f.url}-${i}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-secondary">
                  {f.name || `Berkas ${i + 1}`}
                </p>
                {f.size ? (
                  <p className="text-xs text-muted">{bytes(f.size)}</p>
                ) : null}
              </div>
              <a
                href={`/api/downloads/${encodeURIComponent(token)}/${i}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-dark"
              >
                <Download className="h-3.5 w-3.5" />
                Unduh
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted">
          Simpan berkas yang Anda unduh. Tautan ini bersifat pribadi — mohon tidak
          dibagikan.
        </p>
      </main>
      <Footer />
    </>
  );
}
