"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Send } from "lucide-react";
import { addLeadActivity, fetchLeadActivities } from "@/lib/admin-api";
import type { LeadActivity } from "@/lib/lead-types";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<LeadActivity["type"], string> = {
  catatan: "Catatan",
  status: "Perubahan tahap",
  panggilan: "Panggilan",
  email: "Email",
  wa: "WhatsApp",
  sistem: "Sistem",
};

/**
 * Timeline aktivitas lead (Tema 3.2, FASE L3) + form tambah catatan.
 * Dimuat klien; penambahan via `PATCH /api/admin/leads`.
 */
export function LeadTimeline({ leadId }: { leadId: string }) {
  const toast = useToast();
  const [activities, setActivities] = useState<LeadActivity[] | null>(null);
  const [type, setType] = useState<LeadActivity["type"]>("catatan");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchLeadActivities(leadId).catch(() => []);
      if (active) setActivities(list);
    })();
    return () => {
      active = false;
    };
  }, [leadId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      await addLeadActivity(leadId, { type, note: note.trim() });
      const list = await fetchLeadActivities(leadId).catch(() => []);
      setActivities(list);
      setNote("");
      toast.success("Aktivitas dicatat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat aktivitas.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        Aktivitas
      </p>

      {/* Form tambah */}
      <form onSubmit={onSubmit} className="mt-2 rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LeadActivity["type"])}
            aria-label="Jenis aktivitas"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="catatan">Catatan</option>
            <option value="panggilan">Panggilan</option>
            <option value="email">Email</option>
            <option value="wa">WhatsApp</option>
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tulis catatan / hasil komunikasi..."
            className="min-w-[160px] flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !note.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Catat
          </button>
        </div>
      </form>

      {activities === null ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat aktivitas…
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-3 text-xs text-muted">
          Belum ada aktivitas. Catat hasil komunikasi di atas.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-3">
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                <Plus className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      a.type === "status"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-slate-100 text-slate-600",
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
