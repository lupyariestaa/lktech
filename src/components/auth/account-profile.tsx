"use client";

import { useState } from "react";
import { Check, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tab "Profil": edit nama tampilan + nomor WhatsApp (email read-only). */
export function AccountProfile({
  email,
  initialDisplayName,
  initialWhatsapp,
}: {
  email: string;
  initialDisplayName: string;
  initialWhatsapp: string;
}) {
  const [name, setName] = useState(initialDisplayName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const nameDirty = name.trim() !== initialDisplayName.trim();
  const waDirty = whatsapp.trim() !== initialWhatsapp.trim();
  const dirty = nameDirty || waDirty;
  const tooShort = name.trim().length > 0 && name.trim().length < 2;
  const waDigits = whatsapp.replace(/\D/g, "");
  const waInvalid = whatsapp.trim().length > 0 && waDigits.length < 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !dirty || name.trim().length < 2 || waInvalid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { updateProfile } = await import("@/lib/user-account-api");
      await updateProfile({
        ...(nameDirty ? { displayName: name.trim() } : {}),
        ...(waDirty ? { whatsapp: whatsapp.trim() } : {}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-sm font-bold text-secondary">Profil</h2>
      <p className="mt-1 text-xs text-muted">
        Perbarui nama tampilan & nomor WhatsApp Anda. Email & akun dikelola oleh
        Google.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
        <div>
          <label
            htmlFor="displayName"
            className="text-xs font-semibold text-secondary"
          >
            Nama Tampilan
          </label>
          <input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Nama Anda"
            className={cn(
              "mt-1.5 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30",
              tooShort ? "border-rose-300" : "border-slate-200",
            )}
          />
          {tooShort && (
            <p className="mt-1 text-xs text-rose-500">Nama minimal 2 karakter.</p>
          )}
        </div>

        <div>
          <label
            htmlFor="whatsapp"
            className="text-xs font-semibold text-secondary"
          >
            Nomor WhatsApp
          </label>
          <div className="relative mt-1.5">
            <Phone className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              className={cn(
                "w-full rounded-2xl border bg-white py-3 pr-4 pl-11 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30",
                waInvalid ? "border-rose-300" : "border-slate-200",
              )}
            />
          </div>
          {waInvalid ? (
            <p className="mt-1 text-xs text-rose-500">
              Nomor WhatsApp minimal 8 digit.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Agar kami dapat menghubungi Anda. Contoh: 08123456789.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-secondary">Email</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-slate-100 bg-surface px-4 py-3 text-sm text-muted">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Terverifikasi via Google — tidak dapat diubah.
          </p>
        </div>

        {error && (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !dirty || name.trim().length < 2 || waInvalid}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <Check className="h-4 w-4" /> Tersimpan
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
