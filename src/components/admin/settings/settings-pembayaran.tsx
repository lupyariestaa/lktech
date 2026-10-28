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
import { fetchPaymentMetrics, fetchMayarWebhookHistory, syncMayarWebhookUrl, testIntegration } from "@/lib/admin-settings-api";
import type { MayarWebhookHistoryResult } from "@/lib/admin-settings-api";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/admin/toast";

/** Halaman Pembayaran (Mayar) — kesehatan + metrik (fase S5). */
export function SettingsPembayaran() {
  const toast = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchPaymentMetrics>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [hooks, setHooks] = useState<MayarWebhookHistoryResult | null>(null);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [webhookSynced, setWebhookSynced] = useState(false);

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

  const loadHooks = useCallback(() => {
    (async () => {
      setLoadingHooks(true);
      try {
        setHooks(await fetchMayarWebhookHistory(15));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal memuat riwayat webhook.",
        );
      } finally {
        setLoadingHooks(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const syncWebhookUrl = useCallback(() => {
    (async () => {
      setSyncing(true);
      try {
        const res = await syncMayarWebhookUrl();
        setWebhookSynced(true);
        toast.success(res.message ?? "URL webhook disinkronkan ke Mayar.");
        setLoadingHooks(true);
        try {
          setHooks(await fetchMayarWebhookHistory(15));
        } finally {
          setLoadingHooks(false);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal menyinkronkan URL webhook.",
        );
      } finally {
        setSyncing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              Uji koneksi & izin invoice
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
            <AlertTriangle className="h-4 w-4" /> Riwayat Webhook Mayar
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {hooks?.configured && (
              <button
                type="button"
                onClick={syncWebhookUrl}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Sinkronkan URL ke Mayar
              </button>
            )}
            <button
              type="button"
              onClick={loadHooks}
              disabled={loadingHooks}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100 disabled:opacity-60"
            >
              {loadingHooks ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Muat riwayat webhook
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Menampilkan pengiriman terbaru dari Mayar beserta balasan endpoint kita.
          Bila pesanan tetap “Menunggu Bayar” padahal invoice sudah lunas, periksa
          apakah event <span className="font-mono">payment.received</span> muncul di
          sini dan balasannya bukan 401.
        </p>
        {hooks?.configured && hooks.tokenMatches === false && !webhookSynced && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <p className="font-semibold">Token webhook tidak cocok</p>
            <p className="mt-1">
              Token pada URL yang terdaftar di Mayar berbeda dengan{" "}
              <span className="font-mono">MAYAR_WEBHOOK_TOKEN</span> server. Karena
              itu webhook ditolak (401) dan pesanan tidak berubah menjadi Dibayar.
              Klik “Sinkronkan URL ke Mayar” agar URL didaftarkan ulang memakai
              token server.
            </p>
            {hooks.lastDestination && (
              <p className="mt-1 font-mono break-all">
                Terdaftar: {hooks.lastDestination}
              </p>
            )}
          </div>
        )}
        {hooks?.configured && webhookSynced && hooks.tokenMatches !== true && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            <p className="font-semibold">URL webhook sudah disinkronkan</p>
            <p className="mt-1">
              Mayar kini memakai URL yang token-nya sama dengan{" "}
              <span className="font-mono">MAYAR_WEBHOOK_TOKEN</span> server.
              Riwayat di atas masih menampilkan pengiriman lama (sebelum
              sinkronisasi). Status token akan terkonfirmasi pada pengiriman
              berikutnya — lakukan pembayaran uji untuk memverifikasi.
            </p>
          </div>
        )}
        {hooks?.configured && hooks.tokenMatches === true && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            Token pada URL webhook sudah cocok dengan token server.
          </div>
        )}
        {hooks === null ? (
          <p className="mt-4 text-sm text-muted">
            Klik “Muat riwayat webhook” untuk melihat pengiriman terakhir.
          </p>
        ) : !hooks.configured ? (
          <p className="mt-4 text-sm text-amber-700">
            Mayar belum dikonfigurasi.
          </p>
        ) : hooks.error ? (
          <p className="mt-4 text-sm text-rose-600">{hooks.error}</p>
        ) : hooks.deliveries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Belum ada pengiriman webhook tercatat untuk mode {hooks.mode ?? "?"}.
            Pastikan URL webhook sudah didaftarkan pada akun Mayar yang sama
            ({hooks.apiHost ?? "?"}).
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {hooks.deliveries.map((d) => {
              const responded = d.responsePayload?.trim();
              return (
                <li
                  key={d.id}
                  className="rounded-2xl border border-slate-100 bg-surface px-3 py-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-secondary">
                      {d.type || d.event || "event"}
                    </span>
                    <span
                      className={
                        d.status === "SUCCESS"
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-amber-600"
                      }
                    >
                      {d.status || "—"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5 text-muted">
                    <span>{d.createdAt ? formatDateTime(d.createdAt) : "—"}</span>
                    <span className="truncate">
                      Tujuan: {d.urlDestination || "—"}
                    </span>
                    {d.orderId && <span>Order: {d.orderId}</span>}
                    {typeof d.amount === "number" && (
                      <span>Nominal: {formatRupiah(d.amount)}</span>
                    )}
                    {d.transactionStatus && (
                      <span>Status transaksi: {d.transactionStatus}</span>
                    )}
                    <span className="break-all">
                      Balasan kita: {responded ? responded : "(kosong)"}
                    </span>
                    {d.nextDelivery && (
                      <span>Percobaan ulang: {d.nextDelivery}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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
