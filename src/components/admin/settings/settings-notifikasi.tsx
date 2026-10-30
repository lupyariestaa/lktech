"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  Send,
} from "lucide-react";
import { fetchSettingsWithHealth, saveSettings, type EmailHealth } from "@/lib/admin-api";
import {
  fetchEmailPreview,
  testIntegration,
  type EmailPreviewResponse,
} from "@/lib/admin-settings-api";
import {
  EMAIL_PREVIEW_STATUSES,
  EMAIL_PREVIEW_TEMPLATE_LABELS,
  EMAIL_PREVIEW_TEMPLATES,
  type EmailPreviewStatus,
  type EmailPreviewTemplate,
} from "@/lib/email-preview-pure";
import { ORDER_STATUS_LABEL } from "@/lib/order-types";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-types";
import { FormErrorBanner, SaveRow } from "@/components/admin/settings/settings-form-ui";

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
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainCheck, setDomainCheck] = useState<{
    ok: boolean;
    verdict?: string;
    detail?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // ADM-11: versi dokumen yang dimuat form (dikirim balik saat simpan).
  const [version, setVersion] = useState<string | null>(null);

  // Pratinjau template email pembeli (`EM-P3`) — read-only, pakai pesanan contoh.
  const [previewTemplate, setPreviewTemplate] = useState<EmailPreviewTemplate>("confirmation");
  const [previewStatus, setPreviewStatus] = useState<EmailPreviewStatus>("dibayar");
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSettingsWithHealth();
        if (active) {
          setSettings(data.settings);
          setHealth(data.emailHealth);
          setVersion(data.version);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat.");
          setLoadFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Pratinjau (`EM-P3`): muat ulang saat pilihan template/status berubah.
  useEffect(() => {
    let active = true;
    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const data = await fetchEmailPreview(
          previewTemplate,
          previewTemplate === "status" ? previewStatus : undefined,
        );
        if (active) setPreview(data);
      } catch (err) {
        if (active) {
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Gagal memuat pratinjau.");
        }
      } finally {
        if (active) setPreviewLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [previewTemplate, previewStatus]);

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSaved(false);
    setDirty(true);
  };
  useRegisterDirty(dirty);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await saveSettings(settings, version);
      setSettings(res.settings);
      setVersion(res.version);
      setSaved(true);
      setDirty(false);
      toast.success("Pengaturan notifikasi tersimpan.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
      setError(msg);
      toast.error(msg);
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

  /** F-14: periksa status domain pengirim di Resend tanpa mengirim email. */
  const onCheckDomain = async () => {
    setDomainChecking(true);
    try {
      const res = await testIntegration("email-domain");
      setDomainCheck({ ok: res.ok, verdict: res.verdict, detail: res.detail });
    } catch (err) {
      setDomainCheck({
        ok: false,
        verdict: "unknown",
        detail: err instanceof Error ? err.message : "Gagal memeriksa domain pengirim.",
      });
    } finally {
      setDomainChecking(false);
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
      <FormErrorBanner message={error} loadFailed={loadFailed} />

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
                terkirim ke alamat pemilik akun Resend. Email ke pembeli akan{" "}
                <strong>ditolak (403)</strong>. Verifikasi domain di Resend lalu ubah{" "}
                <code>EMAIL_FROM</code>.
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
            onClick={onCheckDomain}
            disabled={domainChecking}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {domainChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Periksa domain pengirim
          </button>
          <SaveRow
            onSave={onSave}
            saving={saving}
            saved={saved}
            disabled={loadFailed || !dirty}
          />
        </div>

        {/* F-14: hasil pemeriksaan domain Resend (tanpa mengirim email). */}
        {domainCheck && (
          <div
            className={
              domainCheck.verdict === "ready"
                ? "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
                : domainCheck.verdict === "test_only"
                  ? "mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
                  : domainCheck.verdict === "unknown"
                    ? "mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
                    : "mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
            }
          >
            <p className="font-semibold">
              {domainCheck.verdict === "ready"
                ? "Domain pengirim siap"
                : domainCheck.verdict === "test_only"
                  ? "Masih memakai domain uji"
                  : domainCheck.verdict === "unknown"
                    ? "Status domain tidak dapat dipastikan"
                    : "Domain pengirim belum siap"}
            </p>
            <p className="mt-1">{domainCheck.detail}</p>
          </div>
        )}
      </section>

      {/* Pratinjau template (`EM-P3`) — memakai pesanan contoh, tidak mengirim. */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Pratinjau Email ke Pembeli</h2>
        <p className="mt-1 text-xs text-muted">
          Menampilkan email persis seperti yang akan dikirim, memakai <strong>pesanan contoh</strong>.
          Tidak ada email yang benar-benar terkirim.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Template
            <select
              value={previewTemplate}
              onChange={(e) => setPreviewTemplate(e.target.value as EmailPreviewTemplate)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary focus:border-primary focus:outline-none"
            >
              {EMAIL_PREVIEW_TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {EMAIL_PREVIEW_TEMPLATE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          {previewTemplate === "status" && (
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Status
              <select
                value={previewStatus}
                onChange={(e) => setPreviewStatus(e.target.value as EmailPreviewStatus)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary focus:border-primary focus:outline-none"
              >
                {EMAIL_PREVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {previewLoading && (
            <span className="flex items-center gap-2 pb-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat pratinjau...
            </span>
          )}
        </div>

        {previewError && (
          <p role="alert" className="mt-3 text-xs text-rose-600">
            {previewError}
          </p>
        )}

        {preview && (
          <div className="mt-4">
            <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-secondary">
                Subjek
              </span>
              <span className="text-secondary">{preview.subject}</span>
            </p>
            <div
              className="overflow-x-auto rounded-2xl border border-slate-200 bg-surface p-3"
              // HTML disusun server dari PESANAN CONTOH (tanpa masukan pengguna) —
              // bukan konten tak tepercaya. Read-only, tidak pernah dikirim.
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer font-semibold">
                Versi teks (fallback klien email)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-surface p-3 text-[11px] text-secondary">
                {preview.text}
              </pre>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}
