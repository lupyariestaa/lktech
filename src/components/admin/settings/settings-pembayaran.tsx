"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { fetchPaymentMetrics, testIntegration } from "@/lib/admin-settings-api";
import { formatRupiah } from "@/lib/format";
import { useToast } from "@/components/admin/toast";

/** Halaman Pembayaran (Mayar) — kesehatan + metrik (fase S5). */
export function SettingsPembayaran() {
  const toast = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchPaymentMetrics>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  const load = useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await fetchPaymentMetrics(30));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onPing = async () => {
    setPinging(true);
    try {
      const res = await testIntegration("mayar");
      if (res.ok) toast.success(res.detail ?? "Mayar OK.");
      else toast.error(res.detail ?? "Ping Mayar gagal.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal ping.");
    } finally {
      setPinging(false);
    }
  };

  const h = data?.health;
  const m = data?.metrics;

  return (
    <div className="flex flex-col gap-5">
      <div
        className={
          h
            ? h.configured
              ? "flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            : "flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 text-sm text-muted"
        }
      >
        {h?.configured ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>
          {!h
            ? "Memuat status…"
            : h.configured
              ? `Pembayaran online aktif (mode ${h.mode}). Webhook token: ${h.webhookTokenSet ? "terpasang" : "belum"}.`
              : "Mayar belum dikonfigurasi — checkout jatuh ke alur WhatsApp."}
        </span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
            <CreditCard className="h-4 w-4" /> Metrik Pembayaran (30 hari)
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPing}
              disabled={pinging}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100 disabled:opacity-60"
            >
              {pinging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Uji koneksi (ping)
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Muat ulang"
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </div>
        </div>

        {loading || !m ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Order gateway" value={String(m.gatewayOrders)} />
            <Metric label="Dibayar" value={String(m.paid)} tone="emerald" />
            <Metric label="Menunggu" value={String(m.pending)} tone="amber" />
            <Metric label="Kedaluwarsa" value={String(m.expired)} />
            <Metric label="Kurang bayar" value={String(m.mismatch)} tone={m.mismatch > 0 ? "amber" : "slate"} />
            <Metric label="Konversi" value={`${(m.conversionRate * 100).toFixed(1)}%`} tone="primary" />
            <div className="col-span-2 rounded-2xl border border-slate-100 bg-surface px-3 py-3 sm:col-span-3 lg:col-span-6">
              <p className="text-lg font-bold text-primary">{formatRupiah(m.paidAmount)}</p>
              <p className="mt-0.5 text-[11px] text-muted">Nilai omzet dibayar (30 hari)</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "primary" | "slate";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "primary"
          ? "text-primary"
          : "text-secondary";
  return (
    <div className="rounded-2xl border border-slate-100 bg-surface px-3 py-3">
      <p className={`text-lg font-bold tabular-nums ${cls}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}
