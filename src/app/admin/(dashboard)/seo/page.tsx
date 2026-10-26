import type { Metadata } from "next";
import { SeoDashboard } from "@/components/admin/seo-dashboard";
import { SeoAuditPanel } from "@/components/admin/seo-audit-panel";
import { Ga4Panel } from "@/components/admin/ga4-panel";
import { SeoOpsPanel } from "@/components/admin/seo-ops-panel";
import {
  SEO_FEATURE_LABEL,
  parseDisabledFeatures,
  resolveSeoFlags,
  type SeoFeature,
} from "@/lib/seo-flags-pure";

export const metadata: Metadata = {
  title: "SEO & Search Console",
  robots: { index: false, follow: false },
};

/**
 * Pemberitahuan (server-rendered) untuk fitur SEO yang sedang dimatikan lewat
 * kill switch `SEO_DISABLED_FEATURES` (fase D7). Ditampilkan sebagai ganti panel
 * fitur tersebut agar admin tahu kenapa panelnya tidak muncul.
 */
function FeatureDisabledNotice({ feature }: { feature: SeoFeature }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
      <p className="font-semibold">{SEO_FEATURE_LABEL[feature]} dinonaktifkan sementara</p>
      <p className="mt-1 text-xs leading-relaxed">
        Fitur ini dimatikan oleh kill switch server <code>SEO_DISABLED_FEATURES</code>. Hapus{" "}
        <code>{feature}</code> dari variabel tersebut lalu deploy ulang untuk mengaktifkan kembali.
      </p>
    </div>
  );
}

export default function AdminSeoPage() {
  // AUD-10: status kill switch diresolusi di server (sumber tunggal) lalu dipakai
  // untuk menyembunyikan/menandai panel — mencegah panel menampilkan galat 503
  // yang membingungkan.
  const flags = resolveSeoFlags(parseDisabledFeatures(process.env.SEO_DISABLED_FEATURES));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">SEO, Search Console &amp; Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Pantau performa pencarian (Search Console), audit teknis on-demand, dan keterlibatan situs (Google
          Analytics 4). Setiap sumber ditampilkan terpisah agar asal data tetap jelas.
        </p>
      </div>

      <section aria-labelledby="gsc-heading">
        <h2 id="gsc-heading" className="text-lg font-bold text-secondary">
          Google Search Console
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Klik, impresi, dan query/halaman teratas dari hasil pencarian Google.
        </p>
        {flags.gsc ? <SeoDashboard /> : <FeatureDisabledNotice feature="gsc" />}
      </section>

      {flags.audit ? (
        <SeoAuditPanel />
      ) : (
        <div className="mt-6">
          <FeatureDisabledNotice feature="audit" />
        </div>
      )}

      {flags.ga4 ? (
        <Ga4Panel />
      ) : (
        <div className="mt-8">
          <FeatureDisabledNotice feature="ga4" />
        </div>
      )}

      <SeoOpsPanel />
    </div>
  );
}
