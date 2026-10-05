"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, ScrollText, Search } from "lucide-react";
import { fetchAdminAudit } from "@/lib/admin-audit-api";
import {
  ADMIN_AUDIT_ACTION_LABEL,
  type AdminAuditAction,
  type AdminAuditEntry,
} from "@/lib/admin-audit-types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Warna badge per kategori aksi (berdasarkan prefix). */
function accentFor(action: string): string {
  const prefix = action.split(".")[0];
  switch (prefix) {
    case "order":
      return "bg-emerald-50 text-emerald-600";
    case "product":
      return "bg-blue-50 text-blue-600";
    case "coupon":
      return "bg-purple-50 text-purple-600";
    case "user":
      return "bg-amber-50 text-amber-600";
    case "settings":
      return "bg-slate-100 text-slate-600";
    case "review":
      return "bg-rose-50 text-rose-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function AuditLogManager() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("semua");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await fetchAdminAudit({ action: filter, limit: 300 });
        if (!active) return;
        setEntries(list);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat audit log.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  // Filter pencarian di memori (aktor/target/aksi).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.actor.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const actionOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.action));
    return Array.from(set).sort();
  }, [entries]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari aktor, target, atau aksi..."
            aria-label="Cari audit log"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter aksi"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="semua">Semua aksi</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {ADMIN_AUDIT_ACTION_LABEL[a as AdminAuditAction] ?? a}
            </option>
          ))}
        </select>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Muat ulang
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        Menampilkan {filtered.length} entri{entries.length >= 300 ? " (maks 300)" : ""}.
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat audit log...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-secondary">
            Belum ada aktivitas tercatat.
          </p>
          <p className="mt-1 text-xs text-muted">
            Aksi admin penting akan tampil di sini.
          </p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
          {filtered.map((e) => (
            <li key={e.id} className="flex items-start gap-3.5 p-4">
              <span
                className={cn(
                  "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                  accentFor(e.action),
                )}
              >
                <ScrollText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-secondary">
                  {ADMIN_AUDIT_ACTION_LABEL[e.action as AdminAuditAction] ?? e.action}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {e.target ? <span className="font-mono">{e.target}</span> : "—"}
                  {" · "}
                  {e.actor}
                </p>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {Object.entries(e.meta)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-right text-[11px] whitespace-nowrap text-muted">
                {formatDateTime(e.atISO)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
