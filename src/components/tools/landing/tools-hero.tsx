import Link from "next/link";
import { Check, PlayCircle, Sparkles } from "lucide-react";
import { ToolsHeroVisual } from "@/components/tools/landing/tools-hero-visual";
import { ToolsCta } from "@/components/tools/tools-cta";
import { ButtonLink } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools-registry-pure";

const AVAILABLE = TOOLS.filter((tool) => tool.status === "tersedia").length;

/**
 * Hero landing `/tools`: split copy + mockup workspace CSS.
 *
 * Server component; satu-satunya client island adalah `ToolsCta` yang membaca
 * status login untuk memilih `/masuk?next=...` atau `/tools/ruang`.
 */
export function ToolsHero() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-16 sm:pt-36 lg:pb-24">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-10 -right-24 h-[22rem] w-[22rem] animate-aurora rounded-full bg-primary-light/15 blur-[120px] [animation-delay:-6s]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs font-medium text-muted"
          >
            <Link href="/" className="transition-colors hover:text-primary">
              Beranda
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-secondary">Tools</span>
          </nav>

          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            LKTech Tools · Ruang kerja lokal
          </span>

          <h1 className="mt-4 text-4xl leading-[1.08] font-bold tracking-tight text-secondary sm:text-5xl lg:text-[3.6rem]">
            Berkas beres,{" "}
            <span className="text-gradient">tanpa unggah.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Kompres gambar, susun PDF, ambil warna, dan rapikan teks — semuanya
            diproses lokal di browser. Gratis dengan akun LKTech.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ToolsCta
              location="hero"
              target="/tools/ruang"
              className="min-w-[13.5rem]"
            >
              Buka ruang tools
            </ToolsCta>
            <ButtonLink href="#demo" size="lg" variant="outline">
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Coba demo
            </ButtonLink>
          </div>

          <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted">
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Gratis
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Butuh akun LKTech
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Tanpa unggah berkas
            </li>
          </ul>

          <p className="mt-4 text-xs font-semibold text-slate-400">
            {AVAILABLE} tool siap dipakai · 4 kategori · tanpa instalasi
          </p>
        </div>

        <ToolsHeroVisual />
      </div>
    </section>
  );
}
