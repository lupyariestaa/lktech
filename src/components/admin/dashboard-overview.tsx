"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox, Loader2, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { fetchLeads } from "@/lib/admin-api";
import { LEAD_STATUS_LABEL, type StoredLead } from "@/lib/lead-types";
import { cn } from "@/lib/utils";

export function DashboardOverview() {
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchLeads();
        if (active) setLeads(data);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Gagal memuat.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat ringkasan...</span>
      </div>
    );
  }

  const count = (s: string) => leads.filter((l) => l.status === s).length;
  const latest = leads.slice(0, 5);

  const stats = [
    {
      label: "Total Lead",
      value: leads.length,
      icon: Inbox,
      color: "bg-primary-50 text-primary",
    },
    {
      label: LEAD_STATUS_LABEL.baru,
      value: count("baru"),
      icon: Sparkles,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: LEAD_STATUS_LABEL.diproses,
      value: count("diproses"),
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: LEAD_STATUS_LABEL.selesai,
      value: count("selesai"),
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <span
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl",
                  s.color,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-2xl font-bold text-secondary">
                {s.value}
              </p>
              <p className="mt-0.5 text-xs text-muted">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-secondary">Lead Terbaru</h2>
          <Link
            href="/admin/leads"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            Lihat semua
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="mt-6 py-8 text-center text-sm text-muted">
            Belum ada lead masuk.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-slate-100">
            {latest.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-4 py-3.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-xs font-bold text-white">
                  {l.name.charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-secondary">
                    {l.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {l.service} · {l.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-medium text-slate-500">
                  {LEAD_STATUS_LABEL[l.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LeadTrendChart leads={leads} />
    </div>
  );
}

/** Jumlah hari yang ditampilkan pada grafik tren. */
const TREND_DAYS = 14;

type TrendPoint = { key: string; label: string; full: string; count: number };

/** Susun data tren lead harian untuk `TREND_DAYS` hari terakhir. */
function buildTrend(leads: StoredLead[]): TrendPoint[] {
  const days: TrendPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const byDay = new Map<string, number>();
  for (const l of leads) {
    if (!l.createdAt) continue;
    const d = new Date(l.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    days.push({
      key,
      label: d.toLocaleDateString("id-ID", { day: "numeric" }),
      full: d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      count: byDay.get(key) ?? 0,
    });
  }
  return days;
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function LeadTrendChart({ leads }: { leads: StoredLead[] }) {
  const data = buildTrend(leads);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-secondary">
            Tren Lead ({TREND_DAYS} hari terakhir)
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {total} lead masuk dalam periode ini.
          </p>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
          Total {total}
        </span>
      </div>

      {total === 0 ? (
        <p className="mt-6 py-8 text-center text-sm text-muted">
          Belum ada lead pada {TREND_DAYS} hari terakhir.
        </p>
      ) : (
        <div className="mt-6 flex items-end gap-1.5 sm:gap-2">
          {data.map((d) => {
            const height = d.count === 0 ? 4 : Math.round((d.count / max) * 100);
            return (
              <div
                key={d.key}
                className="group relative flex flex-1 flex-col items-center gap-1.5"
                title={`${d.full}: ${d.count} lead`}
              >
                <span className="text-[10px] font-semibold text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                  {d.count}
                </span>
                <div className="flex h-32 w-full items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-colors",
                      d.count === 0
                        ? "bg-slate-100"
                        : "bg-gradient-to-t from-primary to-primary-light group-hover:from-primary-dark",
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
