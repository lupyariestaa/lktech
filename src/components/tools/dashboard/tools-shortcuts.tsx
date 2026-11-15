import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";

export type ToolsShortcutItem = {
  slug: string;
  name: string;
  icon: string;
  /** Keterangan ringan di kanan, mis. "12×". */
  meta?: string;
};

/** Kartu pintasan di dashboard home (favorit / sering dibuka). */
export function ToolsShortcutCard({
  id,
  title,
  description,
  icon: Icon,
  items,
  empty,
  onOpen,
}: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: readonly ToolsShortcutItem[];
  empty: string;
  onOpen?: (slug: string) => void;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id={id} className="text-sm font-bold text-secondary">
            {title}
          </h3>
          <p className="truncate text-[11px] text-muted">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 flex-1 rounded-xl border border-dashed border-slate-200 bg-surface px-3 py-4 text-xs leading-relaxed text-muted">
          {empty}
        </p>
      ) : (
        <ul className="mt-4 flex-1 space-y-1">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/tools/${item.slug}`}
                onClick={() => onOpen?.(item.slug)}
                className="group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-primary group-hover:bg-white">
                  <ToolIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-secondary">
                  {item.name}
                </span>
                {item.meta && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {item.meta}
                  </span>
                )}
                <ArrowRight
                  className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
