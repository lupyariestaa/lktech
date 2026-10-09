import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { Article } from "@/lib/article-types";
import type { Product } from "@/lib/product-types";
import { getService } from "@/lib/services";
import { serviceSlugForCategory } from "@/lib/article-ui";
import { formatPrice } from "@/lib/product-format";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { TrackedRelatedLink } from "@/components/blog/tracked-related-link";
import { TrackedBlogCta } from "@/components/blog/tracked-blog-cta";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

/**
 * Sidebar kanan artikel (B6.2), sticky di desktop. Urutan:
 * 1. Artikel terkait
 * 2. CTA layanan yang relevan dengan kategori
 * 3. Kartu konsultasi WhatsApp
 * 4. Produk digital terkait (tersembunyi bila kosong)
 */
export function ArticleSidebar({
  article,
  related,
  products,
  whatsappNumber,
}: {
  article: Article;
  related: Article[];
  products: Product[];
  whatsappNumber?: string;
}) {
  const service = getService(serviceSlugForCategory(article.category));

  return (
    <aside aria-label="Informasi tambahan" className="flex flex-col gap-6 lg:sticky lg:top-28">
      {related.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-secondary">Artikel terkait</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {related.map((a) => (
              <li key={a.slug}>
                <TrackedRelatedLink from={article.slug} to={a.slug} placement="sidebar" href={`/blog/${a.slug}`} className="group block">
                  <span className="text-sm font-semibold text-secondary transition-colors group-hover:text-primary">
                    {a.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{a.category}</span>
                </TrackedRelatedLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {service && (
        <section className="rounded-2xl border border-primary/20 bg-primary-50/50 p-5">
          <p className="text-xs font-semibold text-primary">Layanan kami</p>
          <h2 className="mt-1 text-sm font-bold text-secondary">{service.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{service.tagline}</p>
          <TrackedBlogCta
            slug={article.slug}
            cta={`layanan:${service.slug}`}
            href={`/layanan/${service.slug}`}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Lihat layanan
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedBlogCta>
        </section>
      )}

      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white">
        <h2 className="text-sm font-bold">Butuh bantuan?</h2>
        <p className="mt-1 text-xs text-white/85">Konsultasi gratis bersama tim LKTech.</p>
        <TrackedWaButton
          location="blog-sidebar"
          label={article.title}
          href={waLink(WA_MESSAGES.general, whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          variant="white"
          size="md"
          className="mt-4 w-full"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Chat via WhatsApp
        </TrackedWaButton>
      </section>

      {products.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-secondary">Produk digital</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {products.map((p) => (
              <li key={p.slug}>
                <Link href={`/produk/${p.slug}`} className="group flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface">
                    {p.cover && p.cover !== "default" && (
                      <Image src={p.cover} alt={p.coverAlt || p.name} fill sizes="48px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-secondary group-hover:text-primary">
                      {p.name}
                    </span>
                    <span className="block text-xs text-muted">{formatPrice(p.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
