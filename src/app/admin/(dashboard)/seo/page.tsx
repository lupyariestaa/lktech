import type { Metadata } from "next";
import { SeoDashboard } from "@/components/admin/seo-dashboard";

export const metadata: Metadata = {
  title: "SEO & Search Console",
  robots: { index: false, follow: false },
};

export default function AdminSeoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">SEO & Search Console</h1>
        <p className="mt-1 text-sm text-muted">
          Pantau klik, impresi, dan query/halaman teratas dari Google Search Console.
        </p>
      </div>
      <SeoDashboard />
    </div>
  );
}
