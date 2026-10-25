import type { Metadata } from "next";
import { SeoDashboard } from "@/components/admin/seo-dashboard";
import { SeoAuditPanel } from "@/components/admin/seo-audit-panel";
import { Ga4Panel } from "@/components/admin/ga4-panel";

export const metadata: Metadata = {
  title: "SEO & Search Console",
  robots: { index: false, follow: false },
};

export default function AdminSeoPage() {
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
        <SeoDashboard />
      </section>

      <SeoAuditPanel />
      <Ga4Panel />
    </div>
  );
}
