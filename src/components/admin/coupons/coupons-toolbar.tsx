"use client";

import { Download, Layers, Plus, RefreshCw, Search } from "lucide-react";

/** Toolbar daftar kupon (cari, filter kampanye, arsip, refresh, ekspor, buat). */
export function CouponsToolbar({
  query,
  onQuery,
  campaignFilter,
  onCampaignFilter,
  campaigns,
  showArchived,
  onShowArchived,
  archivedCount,
  loading,
  onRefresh,
  onExport,
  onCreate,
  onBatch,
}: {
  query: string;
  onQuery: (v: string) => void;
  campaignFilter: string;
  onCampaignFilter: (v: string) => void;
  campaigns: { list: string[]; hasNone: boolean };
  showArchived: boolean;
  onShowArchived: (v: boolean) => void;
  archivedCount: number;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onCreate: () => void;
  onBatch: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Cari kode, deskripsi, atau kampanye…"
          aria-label="Cari kupon"
          className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {(campaigns.list.length > 0 || campaigns.hasNone) && (
          <select
            value={campaignFilter}
            onChange={(e) => onCampaignFilter(e.target.value)}
            aria-label="Filter kampanye"
            className="rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="semua">Semua kampanye</option>
            {campaigns.list.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {campaigns.hasNone && <option value="__none__">Tanpa kampanye</option>}
          </select>
        )}
        {archivedCount > 0 && (
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-secondary">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => onShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            Arsip ({archivedCount})
          </label>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Muat ulang"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </button>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Download className="h-4 w-4" />
          Ekspor CSV
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Buat Kupon
        </button>
        <button
          type="button"
          onClick={onBatch}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100"
        >
          <Layers className="h-4 w-4" />
          Buat Massal
        </button>
      </div>
    </div>
  );
}
