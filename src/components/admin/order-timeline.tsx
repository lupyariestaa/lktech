"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  addOrderNote,
  fetchOrderActivities,
} from "@/lib/admin-orders-api";
import type { OrderActivity } from "@/lib/order-activities";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<OrderActivity["type"], string> = {
  catatan: "Catatan",
  status: "Perubahan status",
  invoice: "Invoice",
  email: "Email",
  sistem: "Sistem",
};

const TYPE_STYLE: Record<OrderActivity["type"], string> = {
  catatan: "bg-slate-100 text-slate-600",
  status: "bg-purple-50 text-purple-600",
  invoice: "bg-primary-50 text-primary",
  email: "bg-sky-50 text-sky-600",
  sistem: "bg-slate-100 text-slate-500",
};

/**
 * Timeline aktivitas pesanan (FASE O6) + form catatan internal. Dimuat klien.
 * Pola mengikuti `lead-timeline`.
 */
export function OrderTimeline({ orderId }: { orderId: string }) {
  const toast = useToast();
  const [activities, setActivities] = useState<OrderActivity[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchOrderActivities(orderId).catch(() => []);
      if (active) setActivities(list);
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      await addOrderNote(orderId, { type: "catatan", note: note.trim() });
      const list = await fetchOrderActivities(orderId).catch(() => []);
      setActivities(list);
      setNote("");
      toast.success("Catatan ditambahkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah catatan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        Timeline & catatan
      </p>

      <form onSubmit={onSubmit} className="mt-2 rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tulis catatan internal..."
            aria-label="Catatan internal"
            className="min-w-[160px] flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !note.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Catat
          </button>
        </div>
      </form>

      {activities === null ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat aktivitas...
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-3 text-xs text-muted">
          Belum ada aktivitas. Perubahan status & catatan akan muncul di sini.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-3">
              <span className="mt-1 grid h-2 w-2 shrink-0 place-items-center rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      TYPE_STYLE[a.type],
                    )}
                  >
                    {TYPE_LABEL[a.type]}
                  </span>
                  <span className="text-muted">{formatDateTime(a.atISO)}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                  {a.note}
                </p>
                {a.actor && (
                  <p className="mt-0.5 text-[11px] text-slate-400">oleh {a.actor}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}