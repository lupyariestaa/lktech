"use client";

import { useState } from "react";
import { Check, Loader2, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import type { SavedAddress } from "@/lib/user-types";
import type { AddressInput } from "@/lib/user-account-api";
import { cn } from "@/lib/utils";

const EMPTY_FORM: AddressInput = {
  label: "",
  recipient: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  note: "",
  isPrimary: false,
};

/** Tab "Alamat": CRUD alamat pengiriman. */
export function AccountAddresses({
  addresses,
  busy,
  onCreate,
  onUpdate,
  onDelete,
}: {
  addresses: SavedAddress[];
  busy: boolean;
  onCreate: (input: AddressInput) => Promise<void>;
  onUpdate: (id: string, patch: Partial<AddressInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("idle");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const startCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, isPrimary: addresses.length === 0 });
    setError(null);
  };

  const startEdit = (a: SavedAddress) => {
    setMode("edit");
    setEditingId(a.id);
    setForm({
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      address: a.address,
      city: a.city,
      postalCode: a.postalCode ?? "",
      note: a.note ?? "",
      isPrimary: a.isPrimary,
    });
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "create") await onCreate(form);
      else if (mode === "edit" && editingId) await onUpdate(editingId, form);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan alamat.");
    }
  };

  const set = <K extends keyof AddressInput>(k: K, v: AddressInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const field =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex flex-col gap-5">
      {addresses.length === 0 && mode === "idle" && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-secondary">
            Belum ada alamat tersimpan.
          </p>
          <p className="mt-1 text-xs text-muted">
            Simpan alamat agar checkout berikutnya lebih cepat.
          </p>
        </div>
      )}

      {addresses.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-3xl border bg-white p-5",
            a.isPrimary ? "border-primary/30 ring-1 ring-primary/15" : "border-slate-200",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-secondary">{a.label}</span>
                {a.isPrimary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <Star className="h-3 w-3 fill-current" /> Utama
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-700">{a.recipient} · {a.phone}</p>
              <p className="mt-0.5 text-sm text-muted">
                {a.address}, {a.city}
                {a.postalCode ? ` ${a.postalCode}` : ""}
              </p>
              {a.note && <p className="mt-0.5 text-xs text-muted">Catatan: {a.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              {!a.isPrimary && (
                <button
                  onClick={() => onUpdate(a.id, { isPrimary: true })}
                  disabled={busy}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                >
                  Jadikan utama
                </button>
              )}
              <button
                onClick={() => startEdit(a)}
                aria-label="Edit alamat"
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(a.id)}
                disabled={busy}
                aria-label="Hapus alamat"
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {mode === "idle" ? (
        <button
          onClick={startCreate}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Tambah Alamat
        </button>
      ) : (
        <form
          onSubmit={submit}
          className="rounded-3xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-secondary">
              {mode === "create" ? "Tambah Alamat" : "Edit Alamat"}
            </h3>
            <button
              type="button"
              onClick={reset}
              aria-label="Batal"
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-secondary">Label</label>
              <input
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="Rumah / Kantor"
                className={cn(field, "mt-1.5")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Nama Penerima</label>
              <input
                value={form.recipient}
                onChange={(e) => set("recipient", e.target.value)}
                className={cn(field, "mt-1.5")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">No. Telepon/WA</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={cn(field, "mt-1.5")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Kota/Kabupaten</label>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={cn(field, "mt-1.5")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-secondary">Alamat Lengkap</label>
              <textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                rows={3}
                className={cn(field, "mt-1.5 resize-none")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Kode Pos (opsional)</label>
              <input
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                className={cn(field, "mt-1.5")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Catatan (opsional)</label>
              <input
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Patokan, jam terima, dll"
                className={cn(field, "mt-1.5")}
              />
            </div>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => set("isPrimary", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            Jadikan alamat utama
          </label>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Simpan
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-secondary"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
