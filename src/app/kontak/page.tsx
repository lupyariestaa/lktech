import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ContactForm } from "@/components/contact-form";
import { ButtonAnchor } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

// Koordinat lokasi kantor (untuk peta Google Maps).
const MAP_LAT = "-7.304071167612529";
const MAP_LNG = "108.12106012781747";

export const metadata: Metadata = {
  title: "Kontak — LKTech",
  description:
    "Hubungi LKTech untuk konsultasi gratis pembuatan website, aplikasi mobile, dan konsultasi teknologi. Kirim pesan lewat form atau WhatsApp.",
  alternates: { canonical: "/kontak" },
  openGraph: {
    title: "Kontak — LKTech",
    description:
      "Konsultasi gratis pembuatan website, aplikasi mobile, dan konsultasi teknologi.",
    url: "/kontak",
  },
};

export const revalidate = 300;

export default async function KontakPage() {
  const settings = await getSiteSettings();

  const contactInfo = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Chat langsung dengan tim kami",
      href: waLink(WA_MESSAGES.general, settings.whatsapp),
      external: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: settings.email,
      href: `mailto:${settings.email}`,
      external: false,
    },
    {
      icon: MapPin,
      label: "Lokasi",
      value: settings.location,
      href: null,
      external: false,
    },
    {
      icon: Clock,
      label: "Jam Respons",
      value: "Senin–Sabtu, 09.00–18.00 WIB",
      href: null,
      external: false,
    },
  ];

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Kontak" }]}
        eyebrow="Kontak"
        title={
          <>
            Mari <span className="text-gradient">bicara proyek Anda</span>
          </>
        }
        description="Konsultasi gratis, tanpa komitmen. Isi form di bawah atau hubungi kami langsung — kami akan merespons secepatnya."
      />

      <section className="relative bg-surface py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_400px]">
          {/* Form */}
          <div>
            <h2 className="text-2xl font-bold text-secondary">
              Kirim pesan
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ceritakan kebutuhan Anda. Semakin detail, semakin cepat kami bisa
              memberikan solusi yang tepat.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          {/* Info kontak */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-bold text-secondary">
                Informasi kontak
              </h3>
              <ul className="mt-5 flex flex-col gap-5">
                {contactInfo.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <span className="flex items-start gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-secondary">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">
                          {item.value}
                        </span>
                      </span>
                    </span>
                  );

                  return (
                    <li key={item.label}>
                      {item.href ? (
                        <a
                          href={item.href}
                          {...(item.external
                            ? {
                                target: "_blank",
                                rel: "noopener noreferrer",
                              }
                            : {})}
                          className="block transition-opacity hover:opacity-80"
                        >
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-xl shadow-primary/25">
              <h3 className="text-base font-bold">Lebih suka chat langsung?</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                Tim kami siap membantu Anda via WhatsApp pada jam kerja.
              </p>
              <ButtonAnchor
                href={waLink(WA_MESSAGES.general, settings.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                variant="white"
                className="mt-5 w-full"
              >
                <MessageCircle className="h-4 w-4" />
                Chat via WhatsApp
              </ButtonAnchor>
            </div>
          </aside>
        </div>
      </section>

      {/* Peta lokasi */}
      <section className="relative bg-white pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-secondary">
                    Lokasi Kami
                  </h2>
                  <p className="text-xs text-muted">{settings.location}</p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${MAP_LAT},${MAP_LNG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
              >
                Buka di Google Maps
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <iframe
              title="Peta lokasi LKTech"
              src={`https://www.google.com/maps?q=${MAP_LAT},${MAP_LNG}&z=16&output=embed`}
              className="h-[360px] w-full border-0 sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </>
  );
}
