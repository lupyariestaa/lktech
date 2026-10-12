"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { fetchSettingsWithHealth, type EmailHealth } from "@/lib/admin-api";
import { fetchIntegrations, type IntegrationsStatus } from "@/lib/admin-settings-api";
import { SETTINGS_NAV } from "@/lib/settings-nav";
import type { SiteSettings } from "@/lib/settings-types";
import { cn } from "@/lib/utils";

/** Halaman induk Pengaturan — ringkasan status nyata + pintasan. */
export function SettingsOverview() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [email, setEmail] = useState<EmailHealth | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const [s, i] = await Promise.all([
        fetchSettingsWithHealth().catch(() => null),
        fetchIntegrations().catch(() => null),
      ]);
      if (s) {
        setSettings(s.settings);
        setEmail(s.emailHealth);
      }
      if (i) setIntegrations(i);
      if (!s && !i) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, i] = await Promise.all([
          fetchSettingsWithHealth().catch(() => null),
          fetchIntegrations().catch(() => null),
        ]);
        if (!active) return;
        if (s) {
          setSettings(s.settings);
          setEmail(s.emailHealth);
        }
        if (i) setIntegrations(i);
        if (!s && !i) setFailed(true);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Status dinamis per kartu (G22: label mengikuti judul halaman SETTINGS_NAV).
  const statusBySlug: Record<
    string,
    { value: string; note: string; ok: boolean; warn?: boolean }
  > = {
    kontak: {
      value: settings ? settings.whatsapp : "—",
      note: settings ? settings.email || "email belum diisi" : "memuat…",
      ok: Boolean(settings?.whatsapp && settings?.email),
    },
    notifikasi: {
      value: email ? (email.configured ? (email.testOnly ? "Mode uji" : "Aktif") : "Nonaktif") : "—",
      note: email ? `Pengirim: ${email.from}` : "memuat…",
      ok: Boolean(email?.configured && !email?.testOnly),
      warn: Boolean(email?.configured && email?.testOnly),
    },
    pembayaran: {
      value: integrations?.mayar.configured ? `Aktif · ${integrations.mayar.mode}` : "Fallback WhatsApp",
      note: integrations?.mayar.webhookTokenSet ? "Webhook token: terpasang" : "Webhook token: belum",
      ok: Boolean(integrations?.mayar.configured),
    },
    integrasi: {
      // G13: status email di sini memakai SUMBER YANG SAMA dengan halaman
      // Notifikasi (`emailHealth`) agar tidak kontradiktif.
      value: integrations
        ? `${[integrations.mayar.configured, Boolean(email?.configured), integrations.cloudinary.configured, integrations.upstash.configured, integrations.cron.configured].filter(Boolean).length}/5 aktif`
        : "—",
      note: "Mayar · Resend · Cloudinary · Upstash · Cron",
      ok: Boolean(integrations?.mayar.configured && email?.configured),
    },
    keamanan: {
      value: "Kelola admin",
      note: "Multi-admin (owner tetap terlindungi)",
      ok: true,
    },
    lanjutan: {
      value: "Maintenance & cache",
      note: "Mode pemeliharaan, bersihkan cache",
      ok: true,
    },
  };

  // Halaman tanpa status dinamis (SEO, backup) tetap diberi kartu netral.
  const staticNote: Record<string, { value: string; note: string }> = {
    seo: { value: "Meta & OG", note: "Meta default, verifikasi mesin pencari" },
    backup: { value: "Ekspor / impor", note: "Backup data terpilih (JSON)" },
  };

  const cards = SETTINGS_NAV.filter((n) => n.slug !== "").map((n) => {
    const s = statusBySlug[n.slug] ?? {
      value: staticNote[n.slug]?.value ?? "Kelola",
      note: staticNote[n.slug]?.note ?? n.desc,
      ok: true,
    };
    return { entry: n, ...s };
  });

  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
        <div className="flex items-start gap-2.5 text-sm text-rose-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Gagal memuat ringkasan status. Periksa koneksi & coba lagi.</span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((it) => {
        const Icon = it.entry.icon;
        return (
          <Link
            key={it.entry.href}
            href={it.entry.href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {it.warn ? (
                <span className="text-amber-500">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Perlu perhatian</span>
                </span>
              ) : it.ok ? (
                <span className="text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Siap</span>
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm font-semibold text-secondary">{it.entry.title}</p>
            <p
              className={cn(
                "mt-0.5 text-lg font-bold",
                it.warn ? "text-amber-600" : it.ok ? "text-emerald-600" : "text-slate-500",
              )}
            >
              {it.value}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">{it.note}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Kelola
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
