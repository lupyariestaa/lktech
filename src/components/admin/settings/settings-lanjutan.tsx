"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Eraser,
  Loader2,
  Save,
  Wrench,
} from "lucide-react";
import { fetchSettingsWithHealth, saveSettings } from "@/lib/admin-api";
import { clearCache } from "@/lib/admin-settings-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-types";

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/** Halaman Lanjutan & Sistem (fase S6): maintenance + cache + info. */
export function SettingsLanjutan() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  const m = settings.maintenance ?? {};
  const updateM = (patch: Partial<NonNullable<SiteSettings["maintenance"]>>) => {
    setSettings((s) => ({ ...s, maintenance: { ...(s.maintenance ?? {}), ...patch } }));
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
      toast.success("Pengaturan sistem tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const onClearCache = async () => {
    setClearing(true);
    try {
      await clearCache();
      toast.success("Cache dibersihkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membersihkan cache.");
    } finally {
      setClearing(false);
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
          <Wrench className="h-4 w-4" /> Mode Pemeliharaan
        </h2>
        <p className="mt-1 text-xs text-muted">
          Saat aktif, pengunjung umum diarahkan ke halaman pemeliharaan; admin tetap bisa bekerja.
        </p>

        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-100 bg-surface px-4 py-3.5">
          <input
            type="checkbox"
            checked={m.enabled === true}
            onChange={(e) => updateM({ enabled: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
          />
          <span>
            <span className="block text-sm font-medium text-secondary">Aktifkan mode pemeliharaan</span>
            <span className="mt-0.5 block text-xs text-muted">
              Halaman publik ({"/maintenance"}) menampilkan gambar & pesan di bawah.
            </span>
          </span>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Judul</span>
            <input
              value={m.title ?? ""}
              onChange={(e) => updateM({ title: e.target.value })}
              className={field}
              placeholder="Sedang Pemeliharaan"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Perkiraan selesai (opsional)</span>
            <input
              type="datetime-local"
              value={m.etaISO ? m.etaISO.slice(0, 16) : ""}
              onChange={(e) =>
                updateM({ etaISO: e.target.value ? new Date(e.target.value).toISOString() : "" })
              }
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-secondary">Pesan</span>
            <textarea
              rows={3}
              value={m.message ?? ""}
              onChange={(e) => updateM({ message: e.target.value })}
              className={`${field} resize-none`}
              placeholder="Kami sedang melakukan peningkatan. Kembali lagi sebentar lagi."
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">URL Gambar (hero)</span>
            <input
              value={m.imageUrl ?? ""}
              onChange={(e) => updateM({ imageUrl: e.target.value })}
              className={field}
              placeholder="https://…/gambar.png"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Alt gambar</span>
            <input
              value={m.imageAlt ?? ""}
              onChange={(e) => updateM({ imageAlt: e.target.value })}
              className={field}
              placeholder="Ilustrasi pemeliharaan"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-secondary">Email kontak (opsional)</span>
            <input
              type="email"
              value={m.contactEmail ?? ""}
              onChange={(e) => updateM({ contactEmail: e.target.value })}
              className={field}
              placeholder="nama@email.com"
            />
          </label>
        </div>

        {/* Pratinjau */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-surface">
          {m.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt={m.imageAlt ?? ""} className="h-40 w-full object-cover" />
          ) : (
            <div className="grid h-40 place-items-center bg-gradient-to-br from-primary/10 to-primary/5 text-xs text-muted">
              Pratinjau gambar
            </div>
          )}
          <div className="p-4">
            <p className="text-sm font-bold text-secondary">{m.title || "Sedang Pemeliharaan"}</p>
            <p className="mt-1 text-xs text-muted">
              {m.message || "Kami sedang melakukan peningkatan."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <Eraser className="h-4 w-4" /> Cache
        </h2>
        <p className="mt-1 text-xs text-muted">
          Bersihkan cache internal (ringkasan pesanan, statistik, dsb) agar data terbaru langsung tampil.
        </p>
        <button
          type="button"
          onClick={onClearCache}
          disabled={clearing}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
          Bersihkan cache
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <Database className="h-4 w-4" /> Informasi Sistem
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted">
          <li>Brand: <strong className="text-secondary">{settings.brandName || "—"}</strong></li>
          <li>Lokasi: <strong className="text-secondary">{settings.location || "—"}</strong></li>
          <li>Kontak email: <strong className="text-secondary">{settings.email || "—"}</strong></li>
        </ul>
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
