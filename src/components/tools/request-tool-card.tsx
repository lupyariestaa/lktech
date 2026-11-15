import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";

/**
 * Kartu ke-6 katalog landing: ajakan mengusulkan tool.
 * Tidak menjanjikan fitur; hanya membuka jalur feedback ke `/kontak`.
 */
export function RequestToolCard() {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-dashed border-slate-300 bg-surface p-6">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-amber-500 shadow-sm">
        <Lightbulb className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-secondary">
        Tool yang Anda butuhkan belum ada?
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
        Ceritakan kebutuhan Anda. Kami tidak menampilkan tool fiktif — usulan
        Anda membantu menentukan tool berikutnya.
      </p>
      <Link
        href="/kontak"
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        Usulkan tool
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
