"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Mail, Phone } from "lucide-react";
import type { StoredLead } from "@/lib/lead-types";
import {
  PIPELINE_ORDER,
  PIPELINE_STAGE_LABEL,
  statusToStage,
  type PipelineStage,
} from "@/lib/lead-scoring-pure";
import { LeadScoreBadge } from "@/components/admin/lead-score-badge";
import { cn } from "@/lib/utils";

/** Warna header kolom per stage. */
const STAGE_ACCENT: Record<PipelineStage, string> = {
  baru: "border-t-blue-500",
  dihubungi: "border-t-amber-500",
  proposal: "border-t-purple-500",
  menang: "border-t-emerald-500",
  kalah: "border-t-slate-400",
};

/**
 * Papan KANBAN pipeline lead (Tema 3.2, FASE L2).
 *
 * - 5 kolom (Baru → Dihubungi → Proposal → Menang → Kalah).
 * - Pindah tahap via tombol ‹ › (aksesibel, keyboard) + **drag & drop** (opsional).
 * - Kartu fokusabel; a11y: tiap kolom `role="list"`, kartu `role="listitem"`.
 */
export function LeadPipelineBoard({
  leads,
  busyIds,
  onStageChange,
  onOpen,
}: {
  leads: StoredLead[];
  busyIds: Set<string>;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onOpen: (lead: StoredLead) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null);

  const grouped: Record<PipelineStage, StoredLead[]> = {
    baru: [],
    dihubungi: [],
    proposal: [],
    menang: [],
    kalah: [],
  };
  for (const l of leads) {
    const stage = (l.stage as PipelineStage) || statusToStage(l.status);
    (grouped[stage] ?? grouped.baru).push(l);
  }

  const idxOf = (s: PipelineStage) => PIPELINE_ORDER.indexOf(s);
  const move = (lead: StoredLead, dir: -1 | 1) => {
    const cur = (lead.stage as PipelineStage) || statusToStage(lead.status);
    const next = PIPELINE_ORDER[idxOf(cur) + dir];
    if (next) onStageChange(lead.id, next);
  };

  return (
    <div className="mt-5 -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {PIPELINE_ORDER.map((stage) => {
        const items = grouped[stage];
        return (
          <section
            key={stage}
            role="list"
            aria-label={`Kolom ${PIPELINE_STAGE_LABEL[stage]}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
            onDrop={() => {
              if (dragId) {
                const lead = leads.find((l) => l.id === dragId);
                const cur = lead ? (lead.stage as PipelineStage) || statusToStage(lead.status) : null;
                if (lead && cur !== stage) onStageChange(lead.id, stage);
              }
              setDragId(null);
              setDragOver(null);
            }}
            className={cn(
              "flex w-[280px] shrink-0 flex-col rounded-2xl border border-t-4 border-slate-200 bg-surface/60 transition-colors sm:w-[300px]",
              STAGE_ACCENT[stage],
              dragOver === stage && "bg-primary-50/60 ring-2 ring-primary/20",
            )}
          >
            <header className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-bold text-secondary">
                {PIPELINE_STAGE_LABEL[stage]}
              </h3>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                {items.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-3">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-muted">
                  Kosong
                </p>
              ) : (
                items.map((lead) => {
                  const cur = (lead.stage as PipelineStage) || statusToStage(lead.status);
                  return (
                    <article
                      key={lead.id}
                      role="listitem"
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                      className={cn(
                        "group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
                        dragId === lead.id && "opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpen(lead)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-secondary hover:text-primary">
                            {lead.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {lead.service || "—"}
                          </p>
                        </button>
                        <LeadScoreBadge score={lead.score} showValue={false} />
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {lead.message}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                        {lead.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email}</span>
                          </span>
                        )}
                        {lead.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                        {busyIds.has(lead.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {PIPELINE_STAGE_LABEL[cur]}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => move(lead, -1)}
                            disabled={idxOf(cur) === 0 || busyIds.has(lead.id)}
                            aria-label="Pindah ke tahap sebelumnya"
                            className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(lead, 1)}
                            disabled={
                              idxOf(cur) === PIPELINE_ORDER.length - 1 ||
                              busyIds.has(lead.id)
                            }
                            aria-label="Pindah ke tahap berikutnya"
                            className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
