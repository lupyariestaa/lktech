"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import {
  DEFAULT_SETTINGS,
  type SiteSettings,
  type SocialLink,
} from "@/lib/settings-types";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

export function SettingsManager() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  useRegisterDirty(dirty);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSettings();
        if (active) setSettings(data);
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

  const update = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => {
    setSettings((s) => ({ ...s, [key]: value }));
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
    setSaved(false);
    setDirty(true);
  };

  const removeSocial = (i: number) => {
    setSettings((s) => ({
      ...s,
      socials: s.socials.filter((_, idx) => idx !== i),
    }));
    setSaved(false);
    setDirty(true);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await saveSettings(settings);
      setSettings(res.settings);
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
        <span className="text-sm">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}
            {loadFailed && (
              <span className="mt-1 block text-xs text-rose-500">
                Muat ulang halaman sebelum menyimpan agar tidak menimpa data
                yang ada.
              </span>
            )}
          </span>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Informasi Kontak</h2>
        <p className="mt-1 text-xs text-muted">
          Dipakai di footer, halaman kontak, dan semua tombol WhatsApp.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Email</span>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="nama@email.com"
              className={fieldBase}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">
              Nomor WhatsApp
            </span>
            <input
              type="text"
              value={settings.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="6283xxxxxxx"
              className={fieldBase}
            />
            <span className="text-xs text-muted">
              Format internasional tanpa tanda + (mis. 6283159688549).
            </span>
          </label>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-secondary">Lokasi</span>
          <input
            type="text"
            value={settings.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Kota, Provinsi"
            className={fieldBase}
          />
        </label>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-secondary">Media Sosial</h2>
            <p className="mt-1 text-xs text-muted">
              Tampil di footer. Kosongkan bila belum ada.
            </p>
          </div>
          <button
            onClick={addSocial}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        </div>

        {settings.socials.length === 0 ? (
          <p className="mt-4 text-xs text-muted">
            Belum ada media sosial. Klik &quot;Tambah&quot; untuk menambahkan.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {settings.socials.map((s, i) => (
              <div
                key={i}
                className="grid gap-3 sm:grid-cols-[140px_1fr_auto]"
              >
                <select
                  value={s.icon}
                  onChange={(e) => updateSocial(i, { icon: e.target.value })}
                  className={fieldBase}
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="github">GitHub</option>
                  <option value="globe">Website</option>
                </select>
                <input
                  type="url"
                  value={s.href}
                  onChange={(e) =>
                    updateSocial(i, {
                      href: e.target.value,
                      label: s.label || labelFromIcon(s.icon),
                    })
                  }
                  placeholder="https://..."
                  className={fieldBase}
                />
                <button
                  onClick={() => removeSocial(i)}
                  aria-label="Hapus"
                  className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={saving || loadFailed}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan Pengaturan
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Tersimpan
          </span>
        )}
      </div>
    </div>
  );
}

function labelFromIcon(icon: string) {
  const map: Record<string, string> = {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    github: "GitHub",
    globe: "Website",
  };
  return map[icon] ?? icon;
}
