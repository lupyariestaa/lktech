import { Mail, MapPin, MessageCircle } from "lucide-react";
import { COMPANY, PAGE_NAV_LINKS, SERVICES, SOCIALS } from "@/lib/content";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-surface">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo height={34} href={null} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Mitra teknologi untuk bisnis Anda. Website, aplikasi mobile, dan
              konsultasi teknologi dengan harga kompetitif.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:border-primary/40 hover:text-primary hover:-translate-y-0.5"
                >
                  <Icon name={s.icon} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary">Navigasi</h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              {PAGE_NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary">Layanan</h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              {SERVICES.slice(0, 5).map((s) => (
                <li key={s.title}>
                  <a
                    href={`/layanan/${s.slug}`}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary">Kontak</h4>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href={waLink(WA_MESSAGES.general)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-sm text-muted transition-colors hover:text-primary"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Chat via WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="flex items-start gap-2.5 text-sm text-muted transition-colors hover:text-primary"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {COMPANY.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {COMPANY.location}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-muted">
            © {COMPANY.year} {COMPANY.name}. Seluruh hak cipta dilindungi.
          </p>
          <p className="text-xs text-muted">
            Dibuat dengan{" "}
            <span className="font-medium text-primary">teknologi modern</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
