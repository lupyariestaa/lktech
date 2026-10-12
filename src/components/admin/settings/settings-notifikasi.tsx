"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { fetchSettingsWithHealth, saveSettings, type EmailHealth } from "@/lib/admin-api";
import { testIntegration } from "@/lib/admin-settings-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-types";

/** Halaman Notifikasi (fase S3). */
export function SettingsNotifikasi() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [health, setHealth] = useState<EmailHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSettingsWithHealth();
        if (active) {
          setSettings(data.settings);
          setHealth(data.emailHealth);
        }
      } catch {
        /* abaikan */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSaved(false);
    setDirty(true);
  };
  useRegisterDirty(dirty);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await saveSettings(settings);
      setSettings(res.settings);
      setSaved(true);
      setDirty(false);
      toast.success("Pengaturan notifikasi tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const res = await testIntegration("email");
      if (res.ok) toast.success(res.detail ?? "Email uji terkirim.");
      else toast.error(res.detail ?? "Gagal mengirim email uji.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menguji email.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat…</span>
      </div>
    );
  }

  const toggles: Array<{ key: keyof SiteSettings; title: string; desc: string }> = [
    {
      key: "notifyBuyerOnOrder",
      title: "Konfirmasi pesanan",
      desc: "Kirim email rincian pesanan ke pembeli saat checkout berhasil.",
    },
    {
      key: "notifyBuyerOnStatus",
      title: "Update status pesanan",
      desc: "Kirim email ke pembeli saat status pesanan berubah.",
    },
    {
      key: "notifyCartReminders",
      title: "Pengingat keranjang terbengkalai",
      desc: "Kirim email pengingat H+1 (butuh cron). Pembeli bisa berhenti kapan saja.",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Status kesehatan email */}
      {health && (
        <div
          className={
            !health.configured
              ? "flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600"
              : health.testOnly
                ? "flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
                : "flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          }
        >
          {!health.configured ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : health.testOnly ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {!health.configured ? (
              <>
                <strong>Email pembeli belum aktif.</strong> <code>RESEND_API_KEY</code> belum diisi.
              </>
            ) : health.testOnly ? (
              <>
                <strong>Mode uji Resend.</strong> Pengirim <code>{health.from}</code> — email hanya
                terkirim ke alamat pemilik akun Resend. Verifikasi domain & ubah <code>EMAIL_FROM</code>.
              </>
            ) : (
              <>
                Email siap. Pengirim: <code>{health.from}</code>.
              </>
            )}
          </span>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Email Otomatis ke Pembeli</h2>
        <p className="mt-1 text-xs text-muted">
          Notifikasi ke admin berjalan terpisah. Perlu domain terverifikasi di Resend agar terkirim ke semua alamat.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {toggles.map((t) => (
            <label key={String(t.key)} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-surface px-4 py-3.5">
              <input
                type="checkbox"
                checked={Boolean(settings[t.key])}
                onChange={(e) => update(t.key, e.target.checked as never)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              <span>
                <span className="block text-sm font-medium text-secondary">{t.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{t.desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-50 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100 disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim email uji ke saya
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Tersimpan
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
