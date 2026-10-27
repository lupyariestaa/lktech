"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Eraser, Loader2, Wrench } from "lucide-react";
import { fetchSettingsWithHealth, saveSettings } from "@/lib/admin-api";
import { clearCache } from "@/lib/admin-settings-api";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-types";
import {
  isoToLocalInput,
  localInputToIso,
  validateUrl,
  validateEmail,
} from "@/lib/settings-form-pure";
import {
  fieldClass as field,
  fieldErrorClass as fieldError,
  FormErrorBanner,
  SaveRow,
} from "@/components/admin/settings/settings-form-ui";

/** Halaman Lanjutan & Sistem (fase S6): maintenance + cache + info. */
export function SettingsLanjutan() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  const m = settings.maintenance ?? {};
  const updateM = (patch: Partial<NonNullable<SiteSettings["maintenance"]>>) => {
    setSettings((s) => ({ ...s, maintenance: { ...(s.maintenance ?? {}), ...patch } }));
    setSaved(false);
    setDirty(true);
  };

  // Validasi klien (gap G11).
  const imgError = useMemo(() => validateUrl(m.imageUrl ?? "", "URL gambar"), [m.imageUrl]);
  const emailError = useMemo(() => validateEmail(m.contactEmail ?? ""), [m.contactEmail]);
  const valid = !imgError && !emailError;

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
      toast.success("Pengaturan sistem tersimpan.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
      setError(msg);
      toast.error(msg);
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
      <FormErrorBanner message={error} loadFailed={loadFailed} />

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
              value={isoToLocalInput(m.etaISO)}
              onChange={(e) => updateM({ etaISO: localInputToIso(e.target.value) })}
              className={field}
            />
            <span className="text-xs text-muted">Waktu lokal (zona perangkat Anda).</span>
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
              className={`${field} ${imgError ? fieldError : ""}`}
              placeholder="https://…/gambar.png"
              aria-invalid={Boolean(imgError)}
              aria-describedby={imgError ? "maintenance-img-error" : undefined}
            />
            {imgError && (
              <span id="maintenance-img-error" role="alert" className="text-xs text-rose-600">
                {imgError}
              </span>
            )}
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
              className={`${field} ${emailError ? fieldError : ""}`}
              placeholder="nama@email.com"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "maintenance-email-error" : undefined}
            />
            {emailError && (
              <span id="maintenance-email-error" role="alert" className="text-xs text-rose-600">
                {emailError}
              </span>
            )}
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
          <li>
            Mode pemeliharaan:{" "}
            <strong className={m.enabled ? "text-amber-600" : "text-emerald-600"}>
              {m.enabled ? "Aktif" : "Nonaktif"}
            </strong>
          </li>
          <li>
            Perkiraan selesai:{" "}
            <strong className="text-secondary">
              {m.etaISO
                ? new Date(m.etaISO).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </strong>
          </li>
          <li>
            Lingkungan: <strong className="text-secondary">{process.env.NODE_ENV ?? "production"}</strong>
          </li>
          <li>
            Brand situs: <strong className="text-secondary">{settings.brandName || "—"}</strong>
          </li>
        </ul>
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
