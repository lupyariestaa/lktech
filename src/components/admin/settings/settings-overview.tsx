"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  Mail,
  Plug,
  ShieldCheck,
  Users,
} from "lucide-react";
import { fetchSettingsWithHealth, type EmailHealth } from "@/lib/admin-api";
import { fetchIntegrations, type IntegrationsStatus } from "@/lib/admin-settings-api";
import type { SiteSettings } from "@/lib/settings-types";
import { cn } from "@/lib/utils";

/** Halaman induk Pengaturan — ringkasan status nyata + pintasan. */
export function SettingsOverview() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [email, setEmail] = useState<EmailHealth | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);

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
      } catch {
        /* abaikan — kartu menampilkan status "—" */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const items = [
    {
      href: "/admin/settings/kontak",
      icon: Mail,
      title: "Kontak & Identitas",
      value: settings ? settings.whatsapp : "—",
      note: settings ? (settings.email || "email belum diisi") : "memuat…",
      ok: Boolean(settings?.whatsapp && settings?.email),
    },
    {
      href: "/admin/settings/notifikasi",
      icon: Bell,
      title: "Notifikasi",
      value: email ? (email.configured ? (email.testOnly ? "Mode uji" : "Aktif") : "Nonaktif") : "—",
      note: email ? `Pengirim: ${email.from}` : "memuat…",
      ok: Boolean(email?.configured && !email?.testOnly),
      warn: Boolean(email?.configured && email?.testOnly),
    },
    {
      href: "/admin/settings/pembayaran",
      icon: CreditCard,
      title: "Pembayaran (Mayar)",
      value: integrations?.mayar.configured ? `Aktif · ${integrations.mayar.mode}` : "Fallback WhatsApp",
      note: integrations?.mayar.webhookTokenSet ? "Webhook token: terpasang" : "Webhook token: belum",
      ok: Boolean(integrations?.mayar.configured),
    },
    {
      href: "/admin/settings/integrasi",
      icon: Plug,
      title: "Integrasi & API",
      value: integrations
        ? `${[integrations.mayar.configured, integrations.email.configured, integrations.cloudinary.configured, integrations.upstash.configured, integrations.cron.configured].filter(Boolean).length}/5 aktif`
        : "—",
      note: "Mayar · Resend · Cloudinary · Upstash · Cron",
      ok: Boolean(integrations?.mayar.configured && integrations?.email.configured),
    },
    {
      href: "/admin/settings/keamanan",
      icon: ShieldCheck,
      title: "Keamanan & Akses",
      value: "Kelola admin",
      note: "Multi-admin (owner tetap terlindungi)",
      ok: true,
    },
    {
      href: "/admin/settings/lanjutan",
      icon: Users,
      title: "Sistem",
      value: "Maintenance & cache",
      note: "Mode pemeliharaan, bersihkan cache",
      ok: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              {it.warn ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : it.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : null}
            </div>
            <p className="mt-3 text-sm font-semibold text-secondary">{it.title}</p>
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
