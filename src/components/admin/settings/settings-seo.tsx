"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { fetchSettingsWithHealth, saveSettings } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-types";
import { validateUrl } from "@/lib/settings-form-pure";
import { SNIPPET_GUIDE, validateOgImageUrl } from "@/lib/seo-workflow-pure";
import { OgPreview, SeoSnippetPreview } from "@/components/admin/seo-preview";
import {
  fieldClass as field,
  fieldErrorClass as fieldError,
  FormErrorBanner,
  SaveRow,
} from "@/components/admin/settings/settings-form-ui";

/** Halaman SEO & Situs (fase S6). */
export function SettingsSeo() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useRegisterDirty(dirty);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSettingsWithHealth();
        if (active) setSettings(data.settings);
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

  const seo = settings.seo ?? {};
  const updateSeo = (patch: Partial<NonNullable<SiteSettings["seo"]>>) => {
    setSettings((s) => ({ ...s, seo: { ...(s.seo ?? {}), ...patch } }));
    setSaved(false);
    setDirty(true);
  };

  const ogError = useMemo(() => validateUrl(seo.ogImage ?? "", "URL gambar OG"), [seo.ogImage]);
  const ogCheck = useMemo(() => validateOgImageUrl(seo.ogImage ?? ""), [seo.ogImage]);

  const onSave = async () => {
    if (ogError) {
      setError(ogError);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await saveSettings(settings);
      setSettings(res.settings);
      setSaved(true);
      setDirty(false);
      toast.success("Pengaturan SEO tersimpan.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
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

  return (
    <div className="flex flex-col gap-5">
      <FormErrorBanner message={error} loadFailed={loadFailed} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <Search className="h-4 w-4" /> Meta Default & Open Graph
        </h2>
        <p className="mt-1 text-xs text-muted">
          Dipakai bila halaman tidak menetapkan meta sendiri. Rekomendasi tampilan: judul{" "}
          {SNIPPET_GUIDE.title.min}–{SNIPPET_GUIDE.title.max}, deskripsi{" "}
          {SNIPPET_GUIDE.description.min}–{SNIPPET_GUIDE.description.max} karakter — ini panduan, bukan
          batas penyimpanan (batas per kolom ada di bawah input).
        </p>
        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Meta Title (default)</span>
            <input
              value={seo.title ?? ""}
              onChange={(e) => updateSeo({ title: e.target.value })}
              maxLength={160}
              className={field}
              placeholder="LKTech — Jasa Pembuatan Website, Aplikasi & Produk Digital"
            />
            <span className="text-[11px] text-muted">{(seo.title ?? "").length}/160 karakter tersimpan</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Meta Description (default)</span>
            <textarea
              rows={3}
              value={seo.description ?? ""}
              onChange={(e) => updateSeo({ description: e.target.value })}
              maxLength={320}
              className={`${field} resize-none`}
              placeholder="Deskripsi singkat situs…"
            />
            <span className="text-[11px] text-muted">{(seo.description ?? "").length}/320 karakter tersimpan</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">URL Gambar OG (default)</span>
            <input
              value={seo.ogImage ?? ""}
              onChange={(e) => updateSeo({ ogImage: e.target.value })}
              maxLength={500}
              className={`${field} ${ogError ? fieldError : ""}`}
              placeholder="https://…/og-image.png"
              aria-invalid={Boolean(ogError)}
              aria-describedby={ogError ? "og-error" : "og-hint"}
            />
            {ogError ? (
              <span id="og-error" role="alert" className="text-xs text-rose-600">
                {ogError}
              </span>
            ) : (
              <span id="og-hint" className="text-[11px] text-muted">
                Maks 500 karakter. Dimensi gambar tidak diperiksa otomatis (perlu memuat gambar).
                {ogCheck.status === "warn" && ogCheck.reason ? ` ${ogCheck.reason}` : ""}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Google Search Console — verification</span>
            <input
              value={seo.searchConsoleId ?? ""}
              onChange={(e) => updateSeo({ searchConsoleId: e.target.value })}
              maxLength={120}
              className={field}
              placeholder="nilai konten meta google-site-verification"
            />
            <span className="text-[11px] text-muted">
              Ditempel ke <code>&lt;meta name=&quot;google-site-verification&quot;&gt;</code>. Maks 120 karakter.
            </span>
          </label>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SeoSnippetPreview
            title={seo.title ?? ""}
            description={seo.description ?? ""}
            titleFallback={settings.brandName ?? "LKTech"}
            descriptionFallback={settings.tagline ?? ""}
            path="/"
          />
          <OgPreview
            title={seo.title?.trim() || settings.brandName || "LKTech"}
            description={seo.description?.trim() || settings.tagline || ""}
            image={seo.ogImage}
          />
        </div>
      </section>

      <SaveRow
        onSave={onSave}
        saving={saving}
        saved={saved}
        disabled={loadFailed || !dirty || Boolean(ogError)}
      />
    </div>
  );
}
