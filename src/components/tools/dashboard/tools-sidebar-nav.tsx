import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_CATEGORY_LABEL,
} from "@/lib/tools-registry-pure";
import { cn } from "@/lib/utils";

const AVAILABLE_TOOLS = TOOLS.filter((tool) => tool.status === "tersedia");

/** Navigasi utama sidebar: kembali ke dashboard home. */
export function ToolsSidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const homeActive =
    pathname === "/tools/ruang" || pathname === "/tools/ruang/";

  return (
    <nav aria-label="Navigasi tools">
      <Link
        href="/tools/ruang"
        onClick={onNavigate}
        aria-current={homeActive ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
          homeActive
            ? "bg-primary-50 text-primary"
            : "text-secondary hover:bg-surface",
        )}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Ruang tools</span>
        {homeActive && (
          <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary uppercase">
            Aktif
          </span>
        )}
      </Link>
    </nav>
  );
}

/**
 * Daftar seluruh tool tersedia, dikelompokkan per kategori.
 * Tool aktif ditandai `aria-current="page"`.
 */
export function ToolsSidebarAllTools({
  activeSlug,
  onNavigate,
  onOpen,
}: {
  activeSlug: string | null;
  onNavigate?: () => void;
  onOpen?: (slug: string) => void;
}) {
  return (
    <ul aria-label="Semua tool" className="space-y-2">
      {TOOL_CATEGORIES.map((category) => {
        const items = AVAILABLE_TOOLS.filter(
          (tool) => tool.category === category,
        );
        if (items.length === 0) return null;

        return (
          <li key={category}>
            <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              {TOOL_CATEGORY_LABEL[category]}
            </p>
            <ul className="space-y-0.5">
              {items.map((tool) => {
                const active = tool.slug === activeSlug;
                return (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}`}
                      onClick={() => {
                        onOpen?.(tool.slug);
                        onNavigate?.();
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                        active
                          ? "bg-primary-50 text-primary"
                          : "text-slate-600 hover:bg-surface hover:text-secondary",
                      )}
                    >
                      <ToolIcon
                        name={tool.icon}
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-primary"
                            : "text-slate-500 group-hover:text-primary",
                        )}
                      />
                      <span className="truncate">{tool.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
