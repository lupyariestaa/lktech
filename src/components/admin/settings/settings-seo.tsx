"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, Search } from "lucide-react";
import { fetchSettingsWithHealth, saveSettings } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-types";

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/** Halaman SEO & Situs (fase S6). */
export function SettingsSeo() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  useRegisterDirty(dirty);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSettingsWithHealth();
        if (active) setSettings(data.settings);
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

  const seo = settings.seo ?? {};
  const updateSeo = (patch: Partial<NonNullable<SiteSettings["seo"]>>) => {
    setSettings((s) => ({ ...s, seo: { ...(s.seo ?? {}), ...patch } }));
    setSaved(false);
    setDirty(true);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await saveSettings(settings);
      setSettings(res.settings);
      setSaved(true);
      setDirty(false);
      toast.success("Pengaturan SEO tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <Search className="h-4 w-4" /> Meta Default & Open Graph
        </h2>
        <p className="mt-1 text-xs text-muted">
          Dipakai bila halaman tidak menetapkan meta sendiri. Judul ≤60, deskripsi ≤160.
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
            <span className="text-[11px] text-muted">{(seo.title ?? "").length}/160</span>
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
            <span className="text-[11px] text-muted">{(seo.description ?? "").length}/320</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">URL Gambar OG (default)</span>
            <input
              value={seo.ogImage ?? ""}
              onChange={(e) => updateSeo({ ogImage: e.target.value })}
              className={field}
              placeholder="https://…/og-image.png"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Google Search Console — verification</span>
            <input
              value={seo.searchConsoleId ?? ""}
              onChange={(e) => updateSeo({ searchConsoleId: e.target.value })}
              className={field}
              placeholder="nilai konten meta google-site-verification"
            />
            <span className="text-[11px] text-muted">
              Ditempel ke <code>&lt;meta name=&quot;google-site-verification&quot;&gt;</code>.
            </span>
          </label>
        </div>
      </section>

      <div className="flex items-center gap-4">
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
    </div>
  );
}
