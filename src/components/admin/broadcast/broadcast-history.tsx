"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { fetchBroadcastHistory } from "@/lib/admin-broadcast-api";
import { BROADCAST_SEGMENT_LABEL } from "@/lib/newsletter-types";
import type { BroadcastLog } from "@/lib/newsletter-pure";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Riwayat broadcast (F-N8) — daftar kampanye yang pernah dikirim. */
export function BroadcastHistory() {
  const [logs, setLogs] = useState<BroadcastLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchBroadcastHistory();
        if (active) setLogs(list);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat riwayat.");
          setLogs([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-secondary">Riwayat Broadcast</h2>

      {error && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {logs === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat riwayat...
        </p>
      ) : logs.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-8 text-center text-sm text-muted">
          Belum ada broadcast terkirim.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-slate-100">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                <History className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-secondary">
                  {log.subject}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{BROADCAST_SEGMENT_LABEL[log.segment]}</span>
                  <span>·</span>
                  <span>{formatDateTime(log.atISO)}</span>
                  {log.actor && (
                    <>
                      <span>·</span>
                      <span>{log.actor}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-emerald-600">{log.sent} terkirim</p>
                {log.failed > 0 && (
                  <p className="text-[11px] font-semibold text-rose-500">
                    {log.failed} gagal
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Ringkasan jumlah penerima per segmen (dipakai di komposer). */
export function SegmentCountsInline({
  counts,
  className,
}: {
  counts: Record<"semua" | "beli" | "belum", number> | null;
  className?: string;
}) {
  if (!counts) return null;
  return (
    <span className={cn("text-xs text-muted", className)}>
      {counts.semua} penerima
      {counts.beli > 0 && ` · ${counts.beli} pernah beli`}
      {counts.belum > 0 && ` · ${counts.belum} belum`}
    </span>
  );
}
