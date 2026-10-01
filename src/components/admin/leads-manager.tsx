"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteLead,
  exportLeadsToCsv,
  fetchLeads,
  updateLeadStatus,
} from "@/lib/admin-api";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  type LeadStatus,
  type StoredLead,
} from "@/lib/lead-types";
import { waLink } from "@/lib/whatsapp";
import { useAsyncList } from "@/components/admin/use-async-list";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

export function LeadsManager() {
  const toast = useToast();
  const {
    data: leads,
    setData: setLeads,
    loading,
    error,
    setError,
    reload: load,
  } = useAsyncList<StoredLead>(fetchLeads, "Gagal memuat lead.");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "semua">("semua");
  // ID lead yang statusnya sedang disinkronkan (cegah double-submit/race).
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<StoredLead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    await load();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const matchQuery =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q) ||
        l.message.toLowerCase().includes(q);
      const matchStatus = filter === "semua" || l.status === filter;
      return matchQuery && matchStatus;
    });
  }, [leads, query, filter]);

  const onStatus = async (id: string, status: LeadStatus) => {
    // Abaikan bila lead ini masih dalam proses update (hindari request ganda).
    if (busyIds.has(id)) return;

    const prev = leads;
    setBusyIds((s) => new Set(s).add(id));
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await updateLeadStatus(id, status);
      toast.success("Status lead diperbarui.");
    } catch (err) {
      setLeads(prev); // rollback
      const msg = err instanceof Error ? err.message : "Gagal memperbarui.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const onExport = () => {
    if (filtered.length === 0) {
      setError("Tidak ada lead untuk diekspor.");
      return;
    }
    exportLeadsToCsv(filtered);
  };

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    const prev = leads;
    setLeads((ls) => ls.filter((l) => l.id !== target.id));
    try {
      await deleteLead(target.id);
      setToDelete(null);
      toast.success(`Lead "${target.name}" dihapus.`);
    } catch (err) {
      setLeads(prev);
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, layanan..."
            aria-label="Cari lead"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as LeadStatus | "semua")}
          aria-label="Filter status lead"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="semua">Semua status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          onClick={onExport}
          disabled={loading || leads.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          title="Ekspor hasil yang tampil ke CSV"
        >
          <Download className="h-4 w-4" />
          Ekspor CSV
        </button>

        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Muat ulang
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        Menampilkan {filtered.length} dari {leads.length} lead.
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
          <span className="text-sm">Memuat lead...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            {leads.length === 0
              ? "Belum ada lead masuk."
              : "Tidak ada lead yang cocok dengan pencarian."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {leads.length === 0
              ? "Lead dari form kontak akan muncul di sini."
              : "Coba ubah kata kunci atau filter."}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {filtered.map((lead) => (
            <article
              key={lead.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-slate-900/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
                    {lead.name.charAt(0).toUpperCase() || "?"}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-secondary">
                      {lead.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {lead.service} ·{" "}
                      {formatDate(lead.createdAt)}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    LEAD_STATUS_STYLE[lead.status],
                  )}
                >
                  {LEAD_STATUS_LABEL[lead.status]}
                </span>
              </div>

              <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-slate-700">
                {lead.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {lead.email}
                </a>
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {lead.phone}
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <select
                  value={lead.status}
                  disabled={busyIds.has(lead.id)}
                  onChange={(e) =>
                    onStatus(lead.id, e.target.value as LeadStatus)
                  }
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>

                <a
                  href={waLink(
                    `Halo ${lead.name}, terima kasih telah menghubungi LKTech!`,
                    lead.phone.replace(/\D/g, "").replace(/^0/, "62"),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Balas WhatsApp
                </a>

                <button
                  onClick={() => setToDelete(lead)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus lead ini?"
        description={`Lead dari "${toDelete?.name}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
