"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Send, Users } from "lucide-react";
import {
  fetchBroadcastOverview,
  type SubscribersSummary,
  type SegmentCounts,
} from "@/lib/admin-broadcast-api";
import { cn } from "@/lib/utils";
import { BroadcastComposer } from "@/components/admin/broadcast/broadcast-composer";
import { SubscribersPanel } from "@/components/admin/broadcast/subscribers-panel";
import { BroadcastHistory } from "@/components/admin/broadcast/broadcast-history";

type Tab = "kirim" | "pelanggan" | "riwayat";

const TABS: Array<{ id: Tab; label: string; icon: typeof Send }> = [
  { id: "kirim", label: "Kirim", icon: Send },
  { id: "pelanggan", label: "Pelanggan", icon: Users },
  { id: "riwayat", label: "Riwayat", icon: Mail },
];

/** Kelola newsletter & kirim broadcast (Tema 2.2). */
export function BroadcastManager() {
  const [summary, setSummary] = useState<SubscribersSummary | null>(null);
  const [counts, setCounts] = useState<SegmentCounts | null>(null);
  const [tab, setTab] = useState<Tab>("kirim");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const o = await fetchBroadcastOverview();
        if (active) {
          setSummary(o.summary);
          setCounts(o.segmentCounts);
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Ringkasan */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Total pelanggan"
          value={summary?.total}
          accent="bg-primary-50 text-primary"
        />
        <SummaryCard
          icon={<Mail className="h-4 w-4" />}
          label="Aktif"
          value={summary?.active}
          accent="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={<Mail className="h-4 w-4" />}
          label="Berhenti"
          value={summary?.unsubscribed}
          accent="bg-slate-100 text-slate-500"
        />
      </div>

      {/* Tab */}
      <div className="mb-4 flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                tab === t.id
                  ? "bg-primary-50 text-primary"
                  : "text-slate-500 hover:text-secondary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "kirim" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <BroadcastComposer />
          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-bold text-secondary">Penerima per Segmen</h2>
              {counts ? (
                <dl className="mt-4 flex flex-col gap-3">
                  <Row label="Semua pelanggan" value={counts.semua} />
                  <Row label="Pernah membeli" value={counts.beli} />
                  <Row label="Belum pernah membeli" value={counts.belum} />
                </dl>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-relaxed text-amber-800">
              <strong className="font-semibold">Catatan:</strong> bila domain Resend
              belum diverifikasi, email hanya terkirim ke alamat terdaftar di akun
              Resend. Verifikasi domain agar broadcast sampai ke semua pelanggan.
            </div>
          </aside>
        </div>
      )}

      {tab === "pelanggan" && <SubscribersPanel />}
      {tab === "riwayat" && <BroadcastHistory />}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", accent)}>
        {icon}
      </span>
      <p className="mt-3 text-lg font-bold text-secondary">{value ?? "—"}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-bold text-secondary">{value}</dd>
    </div>
  );
}
