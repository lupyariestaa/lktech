import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Ticket } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PromoList } from "@/components/promo-list";
import { CtaContact } from "@/components/sections/cta-contact";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { getSiteSettings } from "@/lib/settings";
import { listPublicPromos } from "@/lib/promos";
import { SITE } from "@/lib/site";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Promo & Kode Diskon",
  description:
    "Kumpulan kode promo & diskon LKTech yang sedang berlaku. Gunakan kode saat checkout untuk hemat belanja produk digital & layanan kami.",
  alternates: { canonical: "/promo" },
  openGraph: {
    title: "Promo & Kode Diskon — LKTech",
    description:
      "Kode promo & diskon LKTech yang sedang berlaku. Pakai saat checkout.",
    url: "/promo",
  },
};

export default async function PromoPage() {
  const [promos, settings] = await Promise.all([
    listPublicPromos(),
    getSiteSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Promo", item: `${SITE.url}/promo` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Promo" }]}
        eyebrow="Promo & Diskon"
        title={
          <>
            Hemat dengan <span className="text-gradient">kode promo</span>
          </>
        }
        description="Salin kode yang berlaku di bawah, lalu tempel saat checkout di keranjang untuk menikmati diskon."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/produk"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            Belanja Sekarang
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <TrackedWaButton
            location="promo-hero"
            href={waLink(WA_MESSAGES.pricing, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            variant="outline"
          >
            <MessageCircle className="h-5 w-5" />
            Tanya Promo
          </TrackedWaButton>
        </div>
      </PageHero>

      <section className="relative bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          {promos.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-200 bg-surface py-20 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary">
                <Ticket className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-secondary">
                Belum ada promo aktif
              </h2>
              <p className="mt-2 text-sm text-muted">
                Saat ini belum ada kode promo yang berlaku. Pantau halaman ini
                atau hubungi kami untuk penawaran khusus.
              </p>
              <Link
                href="/kontak"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                Hubungi Kami
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                  Kode Aktif
                </span>
                <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
                  {promos.length} promo sedang{" "}
                  <span className="text-gradient">berlaku</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                  Klik “Pakai Kode Ini” untuk langsung membawanya ke keranjang,
                  atau salin kodenya untuk dipakai nanti.
                </p>
              </div>
              <PromoList promos={promos} />
            </>
          )}
        </div>
      </section>

      <CtaContact />
    </>
  );
}
