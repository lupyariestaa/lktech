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
import {
  applyDerivedCounts,
  formatStatNumber,
  hasVerificationFlags,
  isStatSource,
  publishableStats,
  STAT_MAX_LABEL,
  STAT_MAX_ITEMS,
  STAT_MAX_SUFFIX,
  STAT_MAX_VALUE,
  STAT_SOURCES,
  STAT_SOURCE_DEFAULT_LABEL,
  STAT_SOURCE_DEFAULT_SUFFIX,
  STAT_SOURCE_LABEL,
  STAT_SUFFIX_PRESETS,
  validateStats,
} from "@/lib/stats-pure";
import { fetchDerivedStatCounts } from "@/lib/admin-content-api";
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
  // Dua sumber perubahan: daftar (ListEditor) & metadata statistik (periode).
  const [dirtyList, setDirtyList] = useState(false);
  const [dirtyMeta, setDirtyMeta] = useState(false);
  useRegisterDirty(dirtyList || dirtyMeta);

  // Saat berpindah tab, editor lama unmount → reset status dirty.
  const changeTab = (next: TabKey) => {
    setDirtyList(false);
    setDirtyMeta(false);
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

      {tab === "stats" && (
        <div className="flex flex-col gap-3">
          {isDefaultStats(content.stats) && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Angka statistik di bawah masih <strong>contoh</strong>. Sesuaikan
                dengan pencapaian nyata bisnis Anda.
              </span>
            </div>
          )}
          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-muted">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Centang <strong>Terverifikasi</strong> pada angka yang sudah benar
              agar tayang di situs. Setelah ini dipakai, hanya angka terverifikasi
              yang tampil (maksimal {STAT_MAX_ITEMS} item).
            </span>
          </div>
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
          onDirtyChange={setDirtyList}
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
          onDirtyChange={setDirtyList}
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
        <div className="flex flex-col gap-5">
          <StatsMetaEditor
            value={content.statsAsOf ?? ""}
            saving={saving}
            disabled={loadFailed}
            onDirtyChange={setDirtyMeta}
            onError={reject}
            onSave={(asOf) =>
              commit(
                { statsAsOf: asOf.trim() || undefined },
                { successMessage: "Periode statistik disimpan." },
              )
            }
          />

          <ListEditor
            items={content.stats}
            empty={{ value: 0, suffix: "+", label: "", verified: false }}
            onSave={(items) =>
              saveList("stats", items, "Statistik berhasil disimpan.")
            }
            saving={saving}
            disabled={loadFailed}
            onDirtyChange={setDirtyList}
            onError={reject}
            renderRow={(item, update) => (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-[120px_120px_1fr]">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">Angka</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={STAT_MAX_VALUE}
                      step={1}
                      value={item.value}
                      onChange={(e) => update({ value: Number(e.target.value) })}
                      className={fieldBase}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">Sufiks</span>
                    <input
                      value={item.suffix}
                      maxLength={STAT_MAX_SUFFIX}
                      onChange={(e) => update({ suffix: e.target.value })}
                      placeholder="+ / %"
                      className={fieldBase}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">
                      Label ({item.label.length}/{STAT_MAX_LABEL})
                    </span>
                    <input
                      value={item.label}
                      maxLength={STAT_MAX_LABEL}
                      onChange={(e) => update({ label: e.target.value })}
                      placeholder="mis. Proyek Dikerjakan"
                      className={fieldBase}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {STAT_SUFFIX_PRESETS.map((preset) => (
                    <button
                      key={preset || "kosong"}
                      type="button"
                      onClick={() => update({ suffix: preset })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        item.suffix === preset
                          ? "border-primary/40 bg-primary-50 text-primary"
                          : "border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary",
                      )}
                    >
                      {preset || "tanpa sufiks"}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">
                      Sumber angka
                    </span>
                    <select
                      value={isStatSource(item.source) ? item.source : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!isStatSource(value)) {
                          update({ source: undefined });
                          return;
                        }
                        const patch: Partial<ManagedStat> = { source: value };
                        if (!item.label.trim()) {
                          patch.label = STAT_SOURCE_DEFAULT_LABEL[value];
                        }
                        if (!item.suffix) {
                          patch.suffix = STAT_SOURCE_DEFAULT_SUFFIX[value];
                        }
                        update(patch);
                      }}
                      className={fieldBase}
                    >
                      <option value="">Manual (diisi sendiri)</option>
                      {STAT_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          Turunan — {STAT_SOURCE_LABEL[source]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-[11px] text-muted">
                    {isStatSource(item.source)
                      ? `Angka ini dihitung dari ${STAT_SOURCE_LABEL[item.source]}. Gunakan tombol “Sinkronkan angka turunan” untuk memperbarui; “Klien Puas” dan klaim lain tetap manual.`
                      : "Hanya angka objektif (jumlah proyek/layanan/kota) yang boleh dijadikan turunan."}
                  </p>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">
                    Keterangan / sumber (opsional)
                  </span>
                  <input
                    value={item.note ?? ""}
                    maxLength={200}
                    onChange={(e) => update({ note: e.target.value })}
                    placeholder="mis. Data internal per Okt 2026"
                    className={fieldBase}
                  />
                </label>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={item.verified === true}
                      onChange={(e) => update({ verified: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                    />
                    Terverifikasi (tampil di situs)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={item.featured === true}
                      onChange={(e) => update({ featured: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                    />
                    Sorotan trust bar hero
                  </label>
                </div>
              </div>
            )}
            renderPreview={(draft) => <StatsPreview items={draft} />}
            renderToolbar={(draft, replace) => (
              <StatsToolbar
                items={draft}
                replace={replace}
                disabled={loadFailed}
                onError={reject}
              />
            )}
            validate={validateStats}
          />
        </div>
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
          onDirtyChange={setDirtyList}
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
  renderPreview,
  renderToolbar,
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
  renderPreview?: (items: T[]) => React.ReactNode;
  renderToolbar?: (items: T[], replace: (items: T[]) => void) => React.ReactNode;
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

      {draft.length > 0 && renderToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {renderToolbar(draft, setDraft)}
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

      {draft.length > 0 && renderPreview && (
        <div className="rounded-2xl border border-slate-200 bg-surface p-4">
          {renderPreview(draft)}
        </div>
      )}

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

/**
 * Toolbar editor statistik (S4): aksi massal verifikasi + sinkronisasi angka
 * turunan objektif. Sinkronisasi selalu MANUAL (tombol), tidak ada penjadwalan.
 */
function StatsToolbar({
  items,
  replace,
  disabled,
  onError,
}: {
  items: ManagedStat[];
  replace: (items: ManagedStat[]) => void;
  disabled?: boolean;
  onError: (msg: string | null) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const derivedCount = items.filter((stat) => isStatSource(stat.source)).length;

  const sync = async () => {
    setSyncing(true);
    onError(null);
    try {
      const { counts, asOf } = await fetchDerivedStatCounts();
      const { stats } = applyDerivedCounts(items, counts);
      replace(stats);
      setSyncedAt(asOf);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gagal menyinkronkan angka turunan.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void sync()}
        disabled={disabled || syncing || derivedCount === 0}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
      >
        {syncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Sinkronkan angka turunan
      </button>
      <button
        type="button"
        onClick={() => replace(items.map((s) => ({ ...s, verified: true })))}
        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
      >
        Tandai semua terverifikasi
      </button>
      <button
        type="button"
        onClick={() =>
          replace(items.map((s) => ({ ...s, verified: false, featured: false })))
        }
        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500"
      >
        Kosongkan verifikasi
      </button>
      {derivedCount === 0 ? (
        <span className="text-[11px] text-muted">
          Belum ada angka turunan. Pilih “Sumber angka” pada salah satu item.
        </span>
      ) : syncedAt ? (
        <span className="text-[11px] text-emerald-600">
          Angka turunan disinkronkan {new Date(syncedAt).toLocaleString("id-ID")} — simpan untuk menerapkan.
        </span>
      ) : (
        <span className="text-[11px] text-muted">
          {derivedCount} angka turunan siap disinkronkan dari sumber data.
        </span>
      )}
    </>
  );
}

/** Pratinjau kartu statistik sesuai aturan tayang (khusus editor). */
function StatsPreview({ items }: { items: ManagedStat[] }) {
  const publishable = publishableStats(items, isDefaultStats(items));
  if (publishable.length === 0) {
    return (
      <p className="text-xs text-muted">
        {hasVerificationFlags(items)
          ? "Belum ada angka terverifikasi. Centang “Terverifikasi” pada angka yang benar agar tayang."
          : "Belum ada angka yang tayang. Angka contoh bawaan disembunyikan sampai ditandai terverifikasi."}
      </p>
    );
  }
  const hidden = items.length - publishable.length;
  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-muted">Pratinjau tayang</p>
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary p-4 sm:grid-cols-4">
        {publishable.map((stat, i) => (
          <div key={`${stat.label}-${i}`} className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {formatStatNumber(stat.value)}
              {stat.suffix}
            </p>
            <p className="mt-1 text-[11px] font-medium text-white/60">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <p className="mt-3 text-[11px] text-amber-600">
          {hidden} angka belum terverifikasi sehingga tidak tampil di situs.
        </p>
      )}
    </div>
  );
}

/** Editor tanggal periode statistik (disimpan terpisah dari daftar angka). */
function StatsMetaEditor({
  value,
  saving,
  disabled,
  onSave,
  onDirtyChange,
  onError,
}: {
  value: string;
  saving: boolean;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onError: (msg: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [sig, setSig] = useState(value);
  // Sinkronkan bila data dari server berubah (mis. setelah simpan/muat ulang).
  if (value !== sig) {
    setSig(value);
    setDraft(value);
  }
  const dirty = draft !== sig;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const onSaveClick = async () => {
    onError(null);
    await onSave(draft);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">
          Periode data statistik (opsional)
        </span>
        <span className="text-[11px] text-muted">
          Tampil di caption, mis. &ldquo;Angka kumulatif per 31 Oktober 2026&rdquo;.
        </span>
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={cn(fieldBase, "max-w-xs")}
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveClick}
          disabled={saving || disabled || !dirty}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan periode
        </button>
        {dirty && <span className="text-xs text-amber-600">Belum disimpan</span>}
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
