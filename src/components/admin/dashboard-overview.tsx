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
    </div>
  );
}
