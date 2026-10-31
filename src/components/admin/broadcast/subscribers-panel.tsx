"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, Search, Users } from "lucide-react";
import {
  fetchSubscribers,
  exportSubscribersToCsv,
} from "@/lib/admin-broadcast-api";
import type { Subscriber } from "@/lib/newsletter-types";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { useAdminAccess } from "@/components/admin/admin-access";
import { cn } from "@/lib/utils";

type StatusFilter = "semua" | "aktif" | "berhenti";

/** Panel daftar subscriber (F-N3) — cari, filter status, ekspor CSV. */
export function SubscribersPanel() {
  const toast = useToast();
  const { isOwner } = useAdminAccess();
  const [subs, setSubs] = useState<Subscriber[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("semua");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { subscribers, truncated: cut } = await fetchSubscribers();
        if (active) {
          setSubs(subscribers);
          setTruncated(cut);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat pelanggan.");
          setSubs([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = subs ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (status === "aktif" && s.unsubscribed) return false;
      if (status === "berhenti" && !s.unsubscribed) return false;
      if (!q) return true;
      return (
        s.email.toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q)
      );
    });
  }, [subs, query, status]);

  const onExport = () => {
    if (!isOwner) {
      toast.error("Ekspor PII hanya dapat dilakukan OWNER.");
      return;
    }
    if (filtered.length === 0) {
      toast.error("Tidak ada pelanggan untuk diekspor.");
      return;
    }
    exportSubscribersToCsv(filtered);
    toast.success(`${filtered.length} pelanggan diekspor.`);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-secondary">Daftar Pelanggan</h2>
        {isOwner && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari email, nama, atau sumber..."
            aria-label="Cari pelanggan"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter status pelanggan"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="semua">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="berhenti">Berhenti</option>
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {truncated && subs !== null && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Daftar dibatasi 10.000 pelanggan terbaru — total mungkin lebih besar.
          Gunakan pencarian/ekspor untuk lingkup yang lebih kecil.
        </p>
      )}

      {subs === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat pelanggan...
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-8 text-center text-sm text-muted">
          Tidak ada pelanggan yang cocok.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Nama</th>
                <th className="px-3 py-3">Sumber</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.email} className="hover:bg-surface">
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium text-secondary">{s.email}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">{s.name || "—"}</td>
                  <td className="px-3 py-3 text-xs text-muted">{s.source}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        s.unsubscribed
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-50 text-emerald-600",
                      )}
                    >
                      {s.unsubscribed ? "Berhenti" : "Aktif"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap text-muted">
                    {s.createdAtISO ? formatDateTime(s.createdAtISO) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subs !== null && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Users className="h-3.5 w-3.5" />
          Menampilkan {filtered.length} dari {subs.length}
          {truncated ? "+" : ""} pelanggan.
        </p>
      )}
    </div>
  );
}
