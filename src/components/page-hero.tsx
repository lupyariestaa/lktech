import { cn } from "@/lib/utils";

/**
 * Hero ringkas untuk halaman dalam (bukan landing).
 * Menampilkan breadcrumb opsional, eyebrow, judul, dan deskripsi.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  align = "center",
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  align?: "center" | "left";
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-14 sm:pt-36">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 top-10 h-[22rem] w-[22rem] animate-aurora rounded-full bg-primary-light/20 blur-[120px] [animation-delay:-6s]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />

      <div
        className={cn(
          "relative mx-auto max-w-6xl px-6",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className={cn(
              "mb-5 flex items-center gap-2 text-xs font-medium text-muted",
              align === "center" ? "justify-center" : "justify-start",
            )}
          >
            {breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-300">/</span>}
                {b.href ? (
                  <a
                    href={b.href}
                    className="transition-colors hover:text-primary"
                  >
                    {b.label}
                  </a>
                ) : (
                  <span className="text-secondary">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <span className="inline-flex items-center rounded-full bg-primary-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
            {eyebrow}
          </span>
        )}

        <h1
          className={cn(
            "mt-4 text-3xl font-bold text-secondary sm:text-4xl lg:text-5xl lg:leading-[1.1]",
            align === "center" && "mx-auto max-w-3xl",
          )}
        >
          {title}
        </h1>

        {description && (
          <div
            className={cn(
              "mt-5 text-base leading-relaxed text-muted sm:text-lg",
              align === "center" && "mx-auto max-w-2xl",
            )}
          >
            {description}
          </div>
        )}

        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
