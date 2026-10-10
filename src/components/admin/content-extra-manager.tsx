"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useSiteContent } from "@/components/admin/use-site-content";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import {
  isDefaultStats,
  type ManagedProcess,
  type ManagedStat,
  type ManagedWhyUs,
} from "@/lib/content-types";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

type TabKey = "whyUs" | "process" | "stats" | "technologies";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "whyUs", label: "Keunggulan", hint: "Kartu “Kenapa memilih LKTech?”" },
  { key: "process", label: "Alur Kerja", hint: "Langkah proses di beranda & halaman layanan." },
  { key: "stats", label: "Statistik", hint: "Angka pencapaian di beranda." },
  { key: "technologies", label: "Teknologi", hint: "Logo teknologi pada marquee beranda." },
];

export function ContentExtraManager() {
  const { content, loading, saving, error, loadFailed, reject, reload, commit } =
    useSiteContent();
  const [tab, setTab] = useState<TabKey>("whyUs");
  const [dirty, setDirty] = useState(false);
  useRegisterDirty(dirty);

  // Saat berpindah tab, editor lama unmount → reset status dirty.
  const changeTab = (next: TabKey) => {
    setDirty(false);
    setTab(next);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat konten…</span>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.key === tab)!;

  const saveList = <K extends TabKey>(
    key: K,
    value: (typeof content)[K],
    successMessage: string,
  ) => commit({ [key]: value } as Partial<typeof content>, { successMessage });

  return (
    <div className="flex flex-col gap-6">
      {/* Tab */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Bagian konten beranda"
          className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => changeTab(t.key)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                tab === t.key
                  ? "bg-primary text-white shadow-sm shadow-primary/25"
                  : "text-slate-600 hover:bg-primary-50 hover:text-primary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={reload}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", saving && "animate-spin")} />
          Muat ulang
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}
            {loadFailed && (
              <span className="mt-1 block text-xs text-rose-500">
                Klik &quot;Muat ulang&quot; sebelum menyimpan agar tidak menimpa
                data yang ada.
              </span>
            )}
          </span>
        </div>
      )}

      <p className="text-xs text-muted">{activeTab.hint}</p>

      {tab === "stats" && isDefaultStats(content.stats) && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Angka statistik di bawah masih <strong>contoh</strong>. Sesuaikan
            dengan pencapaian nyata bisnis Anda.
          </span>
        </div>
      )}

      {tab === "whyUs" && (
        <ListEditor
          items={content.whyUs}
          empty={{ title: "", description: "", icon: "sparkles" }}
          onSave={(items) =>
            saveList("whyUs", items, "Keunggulan berhasil disimpan.")
          }
          saving={saving}
          disabled={loadFailed}
          onDirtyChange={setDirty}
          onError={reject}
          renderRow={(item, update) => (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <input
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Judul keunggulan"
                  className={fieldBase}
                />
                <input
                  value={item.icon}
                  onChange={(e) => update({ icon: e.target.value })}
                  placeholder="ikon (mis. wallet)"
                  className={fieldBase}
                />
              </div>
              <textarea
                rows={2}
                value={item.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Deskripsi singkat"
                className={cn(fieldBase, "resize-none")}
              />
            </div>
          )}
          validate={(items) =>
            items.some((i) => !i.title.trim())
              ? "Judul keunggulan wajib diisi."
              : null
          }
        />
      )}

      {tab === "process" && (
        <ListEditor
          items={content.process}
          empty={{ step: "", title: "", description: "" }}
          onSave={(items) =>
            saveList("process", items, "Alur kerja berhasil disimpan.")
          }
          saving={saving}
          disabled={loadFailed}
          onDirtyChange={setDirty}
          onError={reject}
          renderRow={(item, update) => (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <input
                  value={item.step}
                  onChange={(e) => update({ step: e.target.value })}
                  placeholder="01"
                  className={fieldBase}
                />
                <input
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Judul langkah"
                  className={fieldBase}
                />
              </div>
              <textarea
                rows={2}
                value={item.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Deskripsi langkah"
                className={cn(fieldBase, "resize-none")}
              />
            </div>
          )}
          validate={(items) =>
            items.some((i) => !i.title.trim())
              ? "Judul langkah wajib diisi."
              : null
          }
        />
      )}

      {tab === "stats" && (
        <ListEditor
          items={content.stats}
          empty={{ value: 0, suffix: "+", label: "" }}
          onSave={(items) =>
            saveList("stats", items, "Statistik berhasil disimpan.")
          }
          saving={saving}
          disabled={loadFailed}
          onDirtyChange={setDirty}
          onError={reject}
          renderRow={(item, update) => (
            <div className="grid gap-3 sm:grid-cols-[120px_120px_1fr]">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">Angka</span>
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => update({ value: Number(e.target.value) })}
                  className={fieldBase}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">Sufiks</span>
                <input
                  value={item.suffix}
                  onChange={(e) => update({ suffix: e.target.value })}
                  placeholder="+ / %"
                  className={fieldBase}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">Label</span>
                <input
                  value={item.label}
                  onChange={(e) => update({ label: e.target.value })}
                  placeholder="mis. Proyek Dikerjakan"
                  className={fieldBase}
                />
              </label>
            </div>
          )}
          validate={(items) =>
            items.some((i) => !i.label.trim())
              ? "Label statistik wajib diisi."
              : null
          }
        />
      )}

      {tab === "technologies" && (
        <ListEditor
          items={content.technologies}
          empty={{ name: "", logo: "", color: "#64748B", wordmark: false }}
          onSave={(items) =>
            saveList("technologies", items, "Teknologi berhasil disimpan.")
          }
          saving={saving}
          disabled={loadFailed}
          onDirtyChange={setDirty}
          onError={reject}
          renderRow={(item, update) => (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
                <input
                  value={item.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Nama teknologi (mis. React)"
                  className={fieldBase}
                />
                <input
                  value={item.logo}
                  onChange={(e) => update({ logo: e.target.value })}
                  placeholder="Path logo (mis. /tech/react.svg)"
                  className={fieldBase}
                />
                <input
                  value={item.color}
                  onChange={(e) => update({ color: e.target.value })}
                  placeholder="#61DAFB"
                  className={fieldBase}
                  aria-label="Warna brand (hex)"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={item.wordmark}
                  onChange={(e) => update({ wordmark: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                Logo sudah memuat nama brand (sembunyikan label teks)
              </label>
            </div>
          )}
          validate={(items) =>
            items.some((i) => !i.name.trim())
              ? "Nama teknologi wajib diisi."
              : null
          }
        />
      )}
    </div>
  );
}

/**
 * Editor daftar generik: mengelola salinan lokal, tombol simpan per-daftar.
 */
function ListEditor<T extends { [k: string]: unknown }>({
  items,
  empty,
  renderRow,
  onSave,
  validate,
  saving,
  onError,
  onDirtyChange,
  disabled = false,
}: {
  items: T[];
  empty: T;
  renderRow: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  onSave: (items: T[]) => Promise<boolean>;
  validate: (items: T[]) => string | null;
  saving: boolean;
  onError: (msg: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<T[]>(items);

  // Sinkronkan draft bila data dari server berubah (mis. setelah muat ulang).
  const [sig, setSig] = useState(() => JSON.stringify(items));
  const nextSig = JSON.stringify(items);
  if (nextSig !== sig) {
    setSig(nextSig);
    setDraft(items);
  }

  const dirty = JSON.stringify(draft) !== sig;

  useEffect(() => {
    onDirtyChange?.(dirty);
    // Bersihkan saat unmount agar status dirty tidak tertinggal.
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const update = (i: number, patch: Partial<T>) =>
    setDraft((ls) => ls.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const remove = (i: number) => setDraft((ls) => ls.filter((_, j) => j !== i));
  const add = () => setDraft((ls) => [...ls, structuredClone(empty)]);

  const onSaveClick = async () => {
    const msg = validate(draft);
    if (msg) {
      onError(msg);
      return;
    }
    onError(null);
    await onSave(draft);
  };

  return (
    <div className="flex flex-col gap-4">
      {draft.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <p className="text-sm font-medium text-secondary">Belum ada item.</p>
          <p className="mt-1 text-xs text-muted">
            Klik &quot;Tambah&quot; untuk membuat item baru.
          </p>
        </div>
      )}

      {draft.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Item #{i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Hapus item"
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {renderRow(item, (patch) => update(i, patch))}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </button>

        <button
          type="button"
          onClick={onSaveClick}
          disabled={saving || disabled}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan
        </button>
      </div>
    </div>
  );
}

// Tipe dipakai pada props ListEditor generik di atas.
export type {
  ManagedProcess,
  ManagedStat,
  ManagedWhyUs,
};
