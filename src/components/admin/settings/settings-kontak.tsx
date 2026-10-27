"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { fetchSettingsWithHealth, saveSettings } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import {
  DEFAULT_SETTINGS,
  type SiteSettings,
  type SocialLink,
} from "@/lib/settings-types";
import { validateSettingsForm, isFormValid } from "@/lib/settings-form-pure";
import {
  fieldClass as field,
  fieldErrorClass as fieldError,
  FormErrorBanner,
  SaveRow,
} from "@/components/admin/settings/settings-form-ui";

/** Halaman Kontak & Identitas (fase S3). */
export function SettingsKontak() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // ADM-11: versi dokumen yang dimuat form (dikirim balik saat simpan).
  const [version, setVersion] = useState<string | null>(null);
  useRegisterDirty(dirty);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSettingsWithHealth();
        if (active) {
          setSettings(data.settings);
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

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSaved(false);
    setDirty(true);
  };

  const updateSocial = (i: number, patch: Partial<SocialLink>) => {
    setSettings((s) => ({
      ...s,
      socials: s.socials.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)),
    }));
    setSaved(false);
    setDirty(true);
  };
  const addSocial = () => {
    setSettings((s) => ({
      ...s,
      socials: [...s.socials, { label: "", href: "", icon: "instagram" }],
    }));
    setDirty(true);
  };
  const removeSocial = (i: number) => {
    setSettings((s) => ({ ...s, socials: s.socials.filter((_, idx) => idx !== i) }));
    setDirty(true);
  };

  // Validasi klien per-field (gap G11).
  const fieldErrors = useMemo(
    () => validateSettingsForm({ email: settings.email, whatsapp: settings.whatsapp, socials: settings.socials }),
    [settings.email, settings.whatsapp, settings.socials],
  );
  const valid = isFormValid(fieldErrors);

  const onSave = async () => {
    if (!valid) {
      setError("Periksa kembali kolom yang ditandai merah.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await saveSettings(settings, version);
      setSettings(res.settings);
      setVersion(res.version);
      setSaved(true);
      setDirty(false);
      toast.success("Pengaturan tersimpan.");
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
        <h2 className="text-sm font-bold text-secondary">Identitas Brand</h2>
        <p className="mt-1 text-xs text-muted">Nama & tagline dipakai di metadata & identitas situs.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Nama Brand</span>
            <input value={settings.brandName ?? ""} onChange={(e) => update("brandName", e.target.value)} className={field} placeholder="LKTech" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Tagline</span>
            <input value={settings.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} className={field} placeholder="Jasa Pembuatan Website…" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Informasi Kontak</h2>
        <p className="mt-1 text-xs text-muted">Dipakai di footer, halaman kontak, dan semua tombol WhatsApp.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Email</span>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => update("email", e.target.value)}
              className={`${field} ${fieldErrors.email ? fieldError : ""}`}
              placeholder="nama@email.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" role="alert" className="text-xs text-rose-600">
                {fieldErrors.email}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Nomor WhatsApp</span>
            <input
              value={settings.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              className={`${field} ${fieldErrors.whatsapp ? fieldError : ""}`}
              placeholder="6283xxxxxxx"
              aria-invalid={Boolean(fieldErrors.whatsapp)}
              aria-describedby={fieldErrors.whatsapp ? "wa-error" : undefined}
            />
            {fieldErrors.whatsapp ? (
              <span id="wa-error" role="alert" className="text-xs text-rose-600">
                {fieldErrors.whatsapp}
              </span>
            ) : (
              <span className="text-xs text-muted">Format internasional tanpa + (mis. 6283159688549).</span>
            )}
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-secondary">Lokasi</span>
            <input value={settings.location} onChange={(e) => update("location", e.target.value)} className={field} placeholder="Kota, Provinsi" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-secondary">Media Sosial</h2>
            <p className="mt-1 text-xs text-muted">Tampil di footer.</p>
          </div>
          <button type="button" onClick={addSocial} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary">
            <Plus className="h-3.5 w-3.5" /> Tambah
          </button>
        </div>
        {settings.socials.length === 0 ? (
          <p className="mt-4 text-xs text-muted">Belum ada media sosial.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {settings.socials.map((s, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[130px_1fr_1fr_auto]">
                <select
                  value={s.icon}
                  onChange={(e) => {
                    const icon = e.target.value;
                    // Isi label default bila masih kosong / mengikuti label lama.
                    updateSocial(i, { icon, label: s.label || labelFromIcon(icon) });
                  }}
                  className={field}
                  aria-label={`Ikon media sosial ${i + 1}`}
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="github">GitHub</option>
                  <option value="globe">Website</option>
                </select>
                <input
                  value={s.label}
                  onChange={(e) => updateSocial(i, { label: e.target.value })}
                  placeholder="Label (mis. Instagram)"
                  className={`${field} ${fieldErrors[`socials.${i}.label`] ? fieldError : ""}`}
                  aria-label={`Label media sosial ${i + 1}`}
                  aria-invalid={Boolean(fieldErrors[`socials.${i}.label`])}
                />
                <input
                  type="url"
                  value={s.href}
                  onChange={(e) => updateSocial(i, { href: e.target.value, label: s.label || labelFromIcon(s.icon) })}
                  placeholder="https://..."
                  className={`${field} ${fieldErrors[`socials.${i}.href`] ? fieldError : ""}`}
                  aria-label={`URL media sosial ${i + 1}`}
                  aria-invalid={Boolean(fieldErrors[`socials.${i}.href`])}
                />
                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  aria-label={`Hapus media sosial ${i + 1}`}
                  className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {(fieldErrors[`socials.${i}.label`] || fieldErrors[`socials.${i}.href`]) && (
                  <p role="alert" className="text-xs text-rose-600 sm:col-span-4">
                    {fieldErrors[`socials.${i}.label`] ?? fieldErrors[`socials.${i}.href`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <SaveRow
        onSave={onSave}
        saving={saving}
        saved={saved}
        disabled={loadFailed || !dirty || !valid}
      />
    </div>
  );
}

function labelFromIcon(icon: string): string {
  const map: Record<string, string> = {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    github: "GitHub",
    globe: "Website",
  };
  return map[icon] ?? icon;
}
