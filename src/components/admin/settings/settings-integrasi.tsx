"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plug, RefreshCw, Send, XCircle } from "lucide-react";
import {
  fetchIntegrations,
  testIntegration,
  type IntegrationsStatus,
  type IntegrationTestResult,
} from "@/lib/admin-settings-api";
import { useToast } from "@/components/admin/toast";
import { cn } from "@/lib/utils";

type ServiceKey = "mayar" | "email" | "cloudinary" | "upstash";

const SERVICES: Array<{ key: ServiceKey; title: string; desc: string }> = [
  { key: "mayar", title: "Mayar (Pembayaran)", desc: "Invoice online & webhook." },
  { key: "email", title: "Resend (Email)", desc: "Email transaksional ke pembeli." },
  { key: "cloudinary", title: "Cloudinary (Media)", desc: "Penyimpanan & optimasi gambar." },
  { key: "upstash", title: "Upstash (Rate-limit)", desc: "Rate-limit terdistribusi (opsional)." },
];

/** Halaman Integrasi & API — status + uji koneksi (fase S5). */
export function SettingsIntegrasi() {
  const toast = useToast();
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<ServiceKey | null>(null);
  const [results, setResults] = useState<Partial<Record<ServiceKey, IntegrationTestResult>>>({});

  const load = useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        setStatus(await fetchIntegrations());
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

  const isConfigured = (key: ServiceKey): boolean => {
    if (!status) return false;
    if (key === "mayar") return status.mayar.configured;
    if (key === "email") return status.email.configured;
    if (key === "cloudinary") return status.cloudinary.configured;
    return status.upstash.configured;
  };

  const onTest = async (key: ServiceKey) => {
    setTesting(key);
    try {
      const res = await testIntegration(key);
      setResults((r) => ({ ...r, [key]: res }));
      if (res.ok) toast.success(res.detail ?? "OK.");
      else toast.error(res.detail ?? "Gagal.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menguji.");
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-surface px-4 py-3 text-sm text-muted">
        <Plug className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Kredensial layanan disimpan sebagai <strong>environment variable</strong> (Vercel) demi
          keamanan. Di sini hanya status &amp; uji koneksi.
        </span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-secondary">Layanan</h2>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Muat ulang status integrasi"
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          </button>
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-slate-100">
          {SERVICES.map((s) => {
            const ok = isConfigured(s.key);
            const res = results[s.key];
            const busy = testing === s.key;
            return (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-xl",
                      ok ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {ok ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Terkonfigurasi</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Belum terkonfigurasi</span>
                      </>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-secondary">{s.title}</p>
                    <p className="text-xs text-muted">{s.desc}</p>
                    {res && (
                      <p
                        role="status"
                        className={cn(
                          "mt-0.5 text-[11px]",
                          res.ok ? "text-emerald-600" : "text-rose-500",
                        )}
                      >
                        {res.detail ?? (res.ok ? "OK" : "Gagal")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTest(s.key)}
                  // Gap G28: hanya uji bila layanan terkonfigurasi; hanya tombol
                  // yang sedang diuji yang menampilkan spinner (bukan blok semua).
                  disabled={!ok || busy}
                  aria-label={`Uji koneksi ${s.title}`}
                  title={ok ? undefined : "Belum terkonfigurasi — isi env terlebih dahulu."}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Uji koneksi
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {status && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-secondary">Layanan Sistem</h2>
          <p className="mt-1 text-xs text-muted">
            Berjalan di latar & tanpa kredensial yang bisa diuji manual.
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-slate-100">
            <SystemRow
              ok={status.mayar.webhookTokenSet}
              title="Webhook Mayar"
              desc={status.mayar.webhookTokenSet ? "Token webhook terpasang." : "Token webhook belum diisi."}
            />
            <SystemRow
              ok={status.cron.configured}
              title="Cron (kedaluwarsa & pengingat)"
              desc={
                status.cron.configured
                  ? "CRON_SECRET terpasang — cron eksternal dapat memanggil endpoint."
                  : "CRON_SECRET belum diisi — cron eksternal nonaktif."
              }
            />
            <SystemRow
              ok={status.download.configured}
              title="Unduhan produk"
              desc={
                status.download.configured
                  ? "Penandatanganan tautan unduhan aktif."
                  : "Belum dikonfigurasi."
              }
            />
          </ul>
        </section>
      )}
    </div>
  );
}

/** Baris status visual untuk layanan sistem (gap G28) — konsisten dgn "Layanan". */
function SystemRow({ ok, title, desc }: { ok: boolean; title: string; desc: string }) {
  return (
    <li className="flex items-center gap-3 py-3.5">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          ok ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400",
        )}
      >
        {ok ? (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Aktif</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Nonaktif</span>
          </>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-secondary">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
    </li>
  );
}
