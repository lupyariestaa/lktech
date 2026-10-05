"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteLead,
  exportLeadsToCsv,
  fetchLeads,
  updateLeadStatus,
  updateLeadStage,
} from "@/lib/admin-api";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  type LeadStatus,
  type StoredLead,
} from "@/lib/lead-types";
import {
  PIPELINE_ORDER,
  PIPELINE_STAGE_LABEL,
  statusToStage,
  type PipelineStage,
} from "@/lib/lead-scoring-pure";
import { LeadPipelineBoard } from "@/components/admin/lead-pipeline-board";
import { LeadTimeline } from "@/components/admin/lead-timeline";
import { LeadScoreBadge } from "@/components/admin/lead-score-badge";
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
  /** Tampilan: daftar (list) atau papan pipeline (kanban). */
  const [view, setView] = useState<"list" | "pipeline">("list");
  /** Lead yang sedang dibuka pada dialog detail (L3 timeline). */
  const [detail, setDetail] = useState<StoredLead | null>(null);
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

  /** Pindah tahap pipeline (Kanban). Optimistik + rollback. */
  const onStage = async (id: string, stage: PipelineStage) => {
    if (busyIds.has(id)) return;
    const prev = leads;
    setBusyIds((s) => new Set(s).add(id));
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)));
    // Sinkronkan dialog detail (bila terbuka) agar highlight tahap terbarui.
    setDetail((d) => (d && d.id === id ? { ...d, stage } : d));
    try {
      await updateLeadStage(id, stage);
      toast.success(`Tahap: ${PIPELINE_STAGE_LABEL[stage]}.`);
      // Segarkan agar skor (dihitung ulang server) ikut terbarui.
      fetchLeads()
        .then((list) => {
          setLeads(list);
          setDetail((d) => (d ? list.find((l) => l.id === d.id) ?? d : d));
        })
        .catch(() => {});
    } catch (err) {
      setLeads(prev);
      const msg = err instanceof Error ? err.message : "Gagal memindahkan.";
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

        {/* Toggle tampilan: Daftar / Pipeline (Kanban) */}
        <div
          role="group"
          aria-label="Mode tampilan"
          className="flex items-center rounded-full border border-slate-200 bg-white p-1"
        >
          <button
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              view === "list" ? "bg-secondary text-white" : "text-slate-500 hover:text-secondary",
            )}
          >
            <List className="h-3.5 w-3.5" />
            Daftar
          </button>
          <button
            onClick={() => setView("pipeline")}
            aria-pressed={view === "pipeline"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              view === "pipeline" ? "bg-secondary text-white" : "text-slate-500 hover:text-secondary",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Pipeline
          </button>
        </div>

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
      ) : view === "pipeline" ? (
        <LeadPipelineBoard
          leads={filtered}
          busyIds={busyIds}
          onStageChange={onStage}
          onOpen={setDetail}
        />
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

                <div className="flex flex-wrap items-center gap-2">
                  <LeadScoreBadge score={lead.score} />
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      LEAD_STATUS_STYLE[lead.status],
                    )}
                  >
                    {LEAD_STATUS_LABEL[lead.status]}
                  </span>
                </div>
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
                  onClick={() => setDetail(lead)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
                >
                  Detail &amp; Aktivitas
                </button>

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

      {detail && (
        <LeadDetailDialog
          lead={detail}
          onClose={() => setDetail(null)}
          onStageChange={onStage}
        />
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

/**
 * Dialog detail lead: info lengkap + ubah tahap pipeline + timeline aktivitas (L3).
 */
function LeadDetailDialog({
  lead,
  onClose,
  onStageChange,
}: {
  lead: StoredLead;
  onClose: () => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
}) {
  const currentStage =
    (lead.stage as PipelineStage) || statusToStage(lead.status);

  return (
    <div
      className="fixed inset-0 z-[13000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail lead ${lead.name}`}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-secondary">{lead.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {lead.service} · {formatDate(lead.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LeadScoreBadge score={lead.score} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Tahap pipeline */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Tahap Pipeline
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PIPELINE_ORDER.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => onStageChange(lead.id, stage)}
                  aria-pressed={stage === currentStage}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    stage === currentStage
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary",
                  )}
                >
                  {PIPELINE_STAGE_LABEL[stage]}
                </button>
              ))}
            </div>
          </div>

          {/* Kontak */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
              <Mail className="h-3.5 w-3.5" />
              {lead.email || "—"}
            </a>
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
              <Phone className="h-3.5 w-3.5" />
              {lead.phone || "—"}
            </a>
          </div>

          <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {lead.message}
          </p>

          {/* Timeline aktivitas (L3) */}
          <LeadTimeline leadId={lead.id} />
        </div>
      </div>
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
