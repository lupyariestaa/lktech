"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolsCurrentTool } from "@/components/tools/dashboard/tools-current-tool";
import { ToolsFavoriteList } from "@/components/tools/dashboard/tools-favorite-list";
import { ToolsFrequentList } from "@/components/tools/dashboard/tools-frequent-list";
import {
  ToolsSidebarAllTools,
  ToolsSidebarNav,
} from "@/components/tools/dashboard/tools-sidebar-nav";
import { ToolsSidebarFooter } from "@/components/tools/dashboard/tools-sidebar-footer";
import { resolveToolsBySlugs } from "@/lib/tools-discovery-pure";
import {
  TOOLS,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";
import {
  rankFrequentTools,
  type ToolUsageEntry,
} from "@/lib/tools-usage-pure";

const MAX_SIDEBAR_FAVORITES = 5;
const MAX_SIDEBAR_FREQUENT = 3;

function SidebarSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-5 first:mt-0">
      <h2
        id={id}
        className="px-3 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
      >
        {title}
      </h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

/**
 * Isi sidebar yang dipakai bersama oleh sidebar desktop dan drawer mobile.
 *
 * Data favorit/usage diterima dari `ToolsShell` (external store) agar tidak ada
 * Subscription ganda. Tidak ada fetch dan tidak ada data berkas.
 */
export function ToolsSidebarContent({
  pathname,
  activeTool,
  favorites,
  usage,
  onNavigate,
  onToolOpen,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: {
  pathname: string;
  activeTool: ToolDefinition | null;
  favorites: readonly string[];
  usage: readonly ToolUsageEntry[];
  /** Dipanggil setiap navigasi internal (menutup drawer). */
  onNavigate?: () => void;
  /** Analytics klik tool dari sidebar. */
  onToolOpen?: (slug: string) => void;
  /** Hanya drawer: tombol tutup. */
  onClose?: () => void;
  /** Desktop: tampilkan rail ikon sebagai pengganti sidebar penuh. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const favoriteTools = resolveToolsBySlugs(
    favorites.slice(0, MAX_SIDEBAR_FAVORITES),
    TOOLS,
  );
  const frequentTools = rankFrequentTools(
    usage,
    TOOLS,
    MAX_SIDEBAR_FREQUENT,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`flex shrink-0 items-center border-b border-slate-100 py-3 ${collapsed ? "flex-col justify-center gap-3 px-2" : "justify-between gap-2 px-4 py-4"}`}
      >
        <Link
          href="/tools/ruang"
          onClick={onNavigate}
          className={`flex min-w-0 items-center rounded-lg focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${collapsed ? "justify-center" : "gap-2"}`}
          aria-label="LKTech Tools — ruang tools"
        >
          {collapsed ? (
            <Logo href={null} variant="mark" height={32} />
          ) : (
            <>
              <Logo href={null} height={26} />
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase">
                Tools
              </span>
            </>
          )}
        </Link>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Tampilkan sidebar penuh" : "Ciutkan sidebar"}
            aria-expanded={!collapsed}
            aria-controls="tools-sidebar-content"
            title={collapsed ? "Tampilkan sidebar penuh" : "Ciutkan sidebar"}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none lg:grid"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Tutup menu tools"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        id={onToggleCollapsed ? "tools-sidebar-content" : undefined}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-4"
      >
        {collapsed ? (
          <div className="space-y-4">
            <ToolsSidebarNav
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed
            />

            {favoriteTools.length > 0 && (
              <section aria-labelledby="sidebar-favorites-collapsed">
                <h2 id="sidebar-favorites-collapsed" className="sr-only">
                  Favorit
                </h2>
                <ul className="space-y-1">
                  {favoriteTools.map((tool) => (
                    <li key={tool.slug}>
                      <Link
                        href={`/tools/${tool.slug}`}
                        onClick={() => {
                          onToolOpen?.(tool.slug);
                          onNavigate?.();
                        }}
                        aria-label={`Favorit: ${tool.name}`}
                        title={`Favorit: ${tool.name}`}
                        aria-current={tool.slug === activeTool?.slug ? "page" : undefined}
                        className={`flex min-h-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${tool.slug === activeTool?.slug ? "bg-primary-50 text-primary" : "text-amber-500 hover:bg-amber-50"}`}
                      >
                        <span className="relative grid h-5 w-5 place-items-center">
                          <ToolIcon name={tool.icon} className="h-4 w-4" />
                          <Star
                            className="absolute -right-1 -top-1 h-2.5 w-2.5 fill-amber-300 text-amber-500"
                            aria-hidden="true"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {frequentTools.length > 0 && (
              <section aria-labelledby="sidebar-frequent-collapsed">
                <h2 id="sidebar-frequent-collapsed" className="sr-only">
                  Sering dibuka
                </h2>
                <ul className="space-y-1">
                  {frequentTools.map(({ tool, opens }) => (
                    <li key={tool.slug}>
                      <Link
                        href={`/tools/${tool.slug}`}
                        onClick={() => {
                          onToolOpen?.(tool.slug);
                          onNavigate?.();
                        }}
                        aria-label={`Sering dibuka: ${tool.name}, ${opens} kali`}
                        title={`${tool.name} · ${opens}×`}
                        aria-current={tool.slug === activeTool?.slug ? "page" : undefined}
                        className={`flex min-h-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${tool.slug === activeTool?.slug ? "bg-primary-50 text-primary" : "text-slate-500 hover:bg-surface hover:text-primary"}`}
                      >
                        <ToolIcon name={tool.icon} className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="sidebar-all-tools-collapsed">
              <h2 id="sidebar-all-tools-collapsed" className="sr-only">
                Semua tool
              </h2>
              <ToolsSidebarAllTools
                activeSlug={activeTool?.slug ?? null}
                onNavigate={onNavigate}
                onOpen={onToolOpen}
                collapsed
              />
            </section>
          </div>
        ) : (
          <>
            <ToolsSidebarNav pathname={pathname} onNavigate={onNavigate} />

            {activeTool && (
              <SidebarSection id="sidebar-current-tool" title="Sedang dibuka">
                <ToolsCurrentTool tool={activeTool} />
              </SidebarSection>
            )}

            <SidebarSection id="sidebar-favorites" title="Favorit">
              <ToolsFavoriteList
                tools={favoriteTools}
                activeSlug={activeTool?.slug ?? null}
                onNavigate={onNavigate}
                onOpen={onToolOpen}
              />
            </SidebarSection>

            <SidebarSection id="sidebar-frequent" title="Sering dibuka">
              <ToolsFrequentList
                items={frequentTools}
                activeSlug={activeTool?.slug ?? null}
                onNavigate={onNavigate}
                onOpen={onToolOpen}
              />
            </SidebarSection>

            <SidebarSection id="sidebar-all-tools" title="Semua tool">
              <ToolsSidebarAllTools
                activeSlug={activeTool?.slug ?? null}
                onNavigate={onNavigate}
                onOpen={onToolOpen}
              />
            </SidebarSection>
          </>
        )}
      </div>

      <ToolsSidebarFooter onNavigate={onNavigate} collapsed={collapsed} />
    </div>
  );
}
