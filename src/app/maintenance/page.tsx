import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sedang Pemeliharaan",
  robots: { index: false, follow: false },
};

/**
 * Halaman publik mode pemeliharaan — menampilkan gambar + pesan yang diatur dari
 * Pengaturan → Lanjutan. Middleware mengarahkan pengunjung ke sini saat aktif.
 */
export default async function MaintenancePage() {
  const settings = await getSiteSettings();
  const m = settings.maintenance ?? {};
  const eta = m.etaISO ? new Date(m.etaISO) : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-6 py-16">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        {m.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.imageUrl}
            alt={m.imageAlt || "Pemeliharaan"}
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="grid h-56 w-full place-items-center bg-gradient-to-br from-primary/15 to-primary/5">
            <span className="text-sm font-semibold text-primary/70">{settings.brandName}</span>
          </div>
        )}
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-secondary">
            {m.title || "Sedang Pemeliharaan"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {m.message ||
              "Kami sedang melakukan peningkatan layanan. Silakan kembali lagi sebentar lagi."}
          </p>
          {eta && !Number.isNaN(eta.getTime()) && (
            <p className="mt-4 rounded-full bg-primary-50 px-4 py-2 text-xs font-semibold text-primary">
              Perkiraan selesai:{" "}
              {eta.toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "Asia/Jakarta",
              })}
            </p>
          )}
          {m.contactEmail && (
            <p className="mt-4 text-xs text-muted">
              Butuh bantuan?{" "}
              <a href={`mailto:${m.contactEmail}`} className="font-semibold text-primary hover:underline">
                {m.contactEmail}
              </a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
