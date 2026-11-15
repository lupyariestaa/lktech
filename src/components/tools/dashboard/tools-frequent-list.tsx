import Link from "next/link";
import type { FrequentTool } from "@/lib/tools-usage-pure";
import { cn } from "@/lib/utils";

/**
 * Top 3 tool yang paling sering dibuka. Angka `opens` adalah jumlah kunjungan
 * workspace di perangkat ini — bukan jumlah proses berhasil.
 */
export function ToolsFrequentList({
  items,
  activeSlug,
  onNavigate,
  onOpen,
}: {
  items: readonly FrequentTool[];
  activeSlug: string | null;
  onNavigate?: () => void;
  onOpen?: (slug: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-3 text-[11px] leading-relaxed text-muted">
        Belum ada data di perangkat ini. Buka tool untuk mulai menghitung.
      </p>
    );
  }

  const maxOpens = Math.max(...items.map((item) => item.opens), 1);

  return (
    <ul className="space-y-1">
      {items.map(({ tool, opens }) => {
        const active = tool.slug === activeSlug;
        const width = Math.max(8, Math.round((opens / maxOpens) * 100));

        return (
          <li key={tool.slug}>
            <Link
              href={`/tools/${tool.slug}`}
              onClick={() => {
                onOpen?.(tool.slug);
                onNavigate?.();
              }}
              aria-current={active ? "page" : undefined}
              aria-label={`${tool.name}, dibuka ${opens} kali`}
              className={cn(
                "block min-h-11 rounded-lg px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                active
                  ? "bg-primary-50 text-primary"
                  : "text-slate-600 hover:bg-surface hover:text-secondary",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {tool.name}
                </span>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  {opens}×
                </span>
              </span>
              <span
                aria-hidden="true"
                className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-100"
              >
                <span
                  className="block h-full rounded-full bg-primary/40"
                  style={{ width: `${width}%` }}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
