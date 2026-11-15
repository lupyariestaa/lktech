"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Flame,
  Star,
  type LucideIcon,
} from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolsShortcutCard } from "@/components/tools/dashboard/tools-shortcuts";
import {
  useRecentTools,
  useToolFavorites,
  useToolUsage,
} from "@/components/tools/use-tools-preferences";
import {
  trackToolsRecentOpen,
  trackToolsToolOpenIntent,
} from "@/lib/analytics";
import { resolveToolsBySlugs } from "@/lib/tools-discovery-pure";
import {
  TOOLS,
  getToolBySlug,
} from "@/lib/tools-registry-pure";
import {
  findToolUsage,
  formatRelativeTime,
  rankFrequentTools,
  totalToolOpens,
} from "@/lib/tools-usage-pure";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
          {label}
        </dt>
        <dd className="text-lg leading-tight font-bold text-secondary">
          {value}
        </dd>
        <p className="truncate text-[10px] text-muted">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Ringkasan personal dashboard home: statistik lokal, kartu "Lanjutkan",
 * dan pintasan favorit/frekuensi.
 *
 * Semua nilai berasal dari localStorage (slug + angka + waktu). Snapshot
 * server kosong; setelah hidrasi nilainya muncul tanpa hydration mismatch.
 */
export function ToolsDashboardOverview() {
  const favorites = useToolFavorites();
  const recent = useRecentTools();
  const usage = useToolUsage();

  const favoriteTools = resolveToolsBySlugs(favorites, TOOLS).slice(0, 4);
  const frequentTools = rankFrequentTools(usage, TOOLS, 3);
  const lastSlug = recent[0] ?? null;
  const lastTool = lastSlug ? getToolBySlug(lastSlug, TOOLS) : null;
  const lastUsage = lastSlug ? findToolUsage(usage, lastSlug) : null;
  const relative = lastUsage
    ? formatRelativeTime(lastUsage.lastUsedAt)
    : "";
  const totalOpens = totalToolOpens(usage);
  const hasShortcuts =
    favoriteTools.length > 0 || frequentTools.length > 0;

  return (
    <div className="mt-8 space-y-6">
      <dl className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Clock3}
          label="Terakhir dibuka"
          value={relative || "—"}
          hint={lastTool ? lastTool.name : "Belum ada riwayat"}
        />
        <StatCard
          icon={Star}
          label="Favorit"
          value={`${favorites.length}`}
          hint="Di perangkat ini"
        />
        <StatCard
          icon={Flame}
          label="Total dibuka"
          value={`${totalOpens}×`}
          hint="Sejak data lokal dibuat"
        />
      </dl>

      {lastTool && (
        <section aria-labelledby="tools-continue-title">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-white shadow-lg shadow-primary/20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <ToolIcon name={lastTool.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p
                    id="tools-continue-title"
                    className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase"
                  >
                    Lanjutkan
                  </p>
                  <p className="mt-0.5 truncate text-base font-bold">
                    {lastTool.name}
                  </p>
                  <p className="text-xs text-white/75">
                    Terakhir dibuka {relative || "di perangkat ini"}
                  </p>
                </div>
              </div>
              <Link
                href={`/tools/${lastTool.slug}`}
                onClick={() =>
                  trackToolsRecentOpen({ tool: lastTool.slug })
                }
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none"
              >
                Buka lagi
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {hasShortcuts ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ToolsShortcutCard
            id="tools-favorite-shortcuts"
            title="Favorit"
            description="Ditandai bintang di katalog"
            icon={Star}
            items={favoriteTools.map((tool) => ({
              slug: tool.slug,
              name: tool.name,
              icon: tool.icon,
            }))}
            empty="Belum ada favorit. Tandai ★ pada kartu tool."
            onOpen={(slug) =>
              trackToolsToolOpenIntent({ tool: slug, source: "dashboard" })
            }
          />
          <ToolsShortcutCard
            id="tools-frequent-shortcuts"
            title="Sering dibuka"
            description="Hitungan lokal di perangkat ini"
            icon={Flame}
            items={frequentTools.map((item) => ({
              slug: item.tool.slug,
              name: item.tool.name,
              icon: item.tool.icon,
              meta: `${item.opens}×`,
            }))}
            empty="Belum ada hitungan. Buka tool untuk mulai."
            onOpen={(slug) =>
              trackToolsToolOpenIntent({ tool: slug, source: "dashboard" })
            }
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
              <Star className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-secondary">
                Belum ada pintasan
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Tandai favorit atau buka tool — favorit dan hitungan akan
                muncul di sini.
              </p>
            </div>
          </div>
          <a
            href="#katalog"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-4 text-xs font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            Jelajahi katalog
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
