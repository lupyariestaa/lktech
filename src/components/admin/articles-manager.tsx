"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/media-types";
import { buildImageSnippet } from "@/lib/markdown-insert";
import {
  draftStorageKey,
  isoToWibInput,
  lengthStatus,
  wibInputToIso,
} from "@/lib/article-editor";
import { useEffect } from "react";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import Image from "next/image";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  bulkArticles,
  deleteArticle,
  fetchArticles,
  saveArticle,
  saveMedia,
} from "@/lib/admin-api";
import { ArticlesList } from "@/components/admin/articles-list";
import { duplicateSlug, type BulkAction } from "@/lib/article-manage";
import { ARTICLE_CATEGORIES, type Article, type StoredArticle } from "@/lib/article-types";
import { ImageUploader } from "@/components/admin/image-uploader";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";
import { useAsyncList } from "@/components/admin/use-async-list";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import type { CloudinaryAsset } from "@/lib/cloudinary-client";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

const emptyArticle: Article = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  category: "Tips & Trik",
  tags: [],
  cover: "default",
  author: "LKTech",
  status: "published",
  publishedAt: new Date().toISOString(),
};

export function ArticlesManager() {
  const toast = useToast();
  const {
    data: items,
    setData: setItems,
    loading,
    error,
    setError,
    reload: load,
  } = useAsyncList<StoredArticle>(fetchArticles, "Gagal memuat artikel.");
  const [editing, setEditing] = useState<Article | null>(null);
  const [isNew, setIsNew] = useState(false);
  /** Slug asli saat artikel dibuka untuk diedit (deteksi rename, B5.7). */
  const [originalSlug, setOriginalSlug] = useState("");
  /** Kunci autosave aktif untuk form yang sedang terbuka (B3.4). */
  const draftKey = editing ? draftStorageKey(isNew ? "" : originalSlug) : null;
  /** Draft tersimpan yang belum dipulihkan (ditawarkan di banner). */
  const [savedDraft, setSavedDraft] = useState<{ article: Article; at: string } | null>(null);

  // Autosave: tulis draft ke localStorage, di-debounce ~800 ms.
  useEffect(() => {
    if (!editing || !draftKey) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ article: editing, at: new Date().toISOString() }),
        );
      } catch {
        /* penyimpanan penuh/diblokir: abaikan */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [editing, draftKey]);


  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<StoredArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form terbuka â†’ tandai ada perubahan belum disimpan (guard navigasi sidebar).
  useRegisterDirty(editing !== null);

  const refresh = async () => {
    await load();
  };

  /** Cek draft tersimpan untuk kunci ini (dipanggil saat form dibuka, bukan di efek). */
  const findDraft = (key: string) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { article: Article; at: string };
      return parsed?.article ? parsed : null;
    } catch {
      return null;
    }
  };

  const onNew = () => {
    setEditing({ ...emptyArticle });
    setIsNew(true);
    setOriginalSlug("");
    setSavedDraft(findDraft(draftStorageKey("")));
  };

  const onEdit = (a: StoredArticle) => {
    const { id: _id, ...rest } = a;
    void _id;
    setEditing({ ...rest });
    setIsNew(false);
    setOriginalSlug(a.slug);
    setSavedDraft(findDraft(draftStorageKey(a.slug)));
  };

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    const prev = items;
    setItems((ls) => ls.filter((l) => l.slug !== target.slug));
    try {
      await deleteArticle(target.slug);
      setToDelete(null);
      toast.success(`Artikel "${target.title}" dihapus.`);
    } catch (err) {
      setItems(prev);
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  /** Duplikat: buat draft baru dengan slug `-salinan` (B4.4). */
  const onDuplicate = async (a: StoredArticle) => {
    const { id: _id, ...rest } = a;
    void _id;
    const taken = new Set(items.map((i) => i.slug));
    const copy: Article = {
      ...rest,
      slug: duplicateSlug(a.slug, taken),
      title: `${a.title} (salinan)`,
      status: "draft",
      scheduledAt: undefined,
      publishedAt: new Date().toISOString(),
      slugHistory: [],
    };
    try {
      await saveArticle({ ...copy, duplicatedFrom: a.slug });
      await load({ silent: true });
      toast.success(`Salinan dibuat sebagai draft: ${copy.slug}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menduplikat.";
      setError(msg);
      toast.error(msg);
    }
  };

  /** Aksi massal (B4.3). Hasil per item ditampilkan ringkas. */
  const onBulk = async (action: BulkAction, slugs: string[]) => {
    try {
      const res = await bulkArticles(action, slugs);
      await load({ silent: true });
      if (res.failed > 0) toast.error(`${res.done} berhasil, ${res.failed} gagal.`);
      else toast.success(`${res.done} artikel diproses.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Aksi massal gagal.";
      setError(msg);
      toast.error(msg);
    }
  };

  const onSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      const msg = "Judul wajib diisi.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (editing.scheduledAt && Number.isNaN(Date.parse(editing.scheduledAt))) {
      const msg = "Jadwal terbit tidak valid.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Slug berubah pada artikel yang sudah ada → kirim slug lama untuk riwayat redirect.
      const renamedFrom =
        !isNew && originalSlug && originalSlug !== editing.slug ? originalSlug : undefined;
      await saveArticle(renamedFrom ? { ...editing, renamedFrom } : editing);
      if (draftKey) window.localStorage.removeItem(draftKey);
      setEditing(null);
      await load({ silent: true });
      toast.success(isNew ? "Artikel dibuat." : "Artikel diperbarui.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        {savedDraft && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>
              Ada draft belum tersimpan ({new Date(savedDraft.at).toLocaleString("id-ID")}).
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(savedDraft.article);
                  setSavedDraft(null);
                }}
                className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Pulihkan
              </button>
              <button
                type="button"
                onClick={() => {
                  if (draftKey) window.localStorage.removeItem(draftKey);
                  setSavedDraft(null);
                }}
                className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold"
              >
                Buang
              </button>
            </div>
          </div>
        )}
        <ArticleForm
          article={editing}
          isNew={isNew}
          saving={saving}
          onChange={setEditing}
          onSave={onSave}
          onCancel={() => setEditing(null)}
          error={error}
          originalSlug={originalSlug}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{items.length} artikel</p>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Muat ulang
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Artikel Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <ArticlesList
        items={items}
        loading={loading}
        onEdit={onEdit}
        onDelete={(a) => setToDelete(a)}
        onDuplicate={onDuplicate}
        onBulk={onBulk}
        onRefreshRequest={refresh}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus artikel ini?"
        description={`"${toDelete?.title}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
function ArticleForm({
  article,
  isNew,
  saving,
  onChange,
  onSave,
  onCancel,
  error,
  originalSlug,
}: {
  article: Article;
  isNew: boolean;
  saving: boolean;
  onChange: (a: Article) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  originalSlug: string;
}) {
  const set = <K extends keyof Article>(key: K, value: Article[K]) =>
    onChange({ ...article, [key]: value });

  // Konfirmasi saat menutup form (mencegah kehilangan ketikan).
  const { guard, dialogProps } = useUnsavedChanges(true);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-secondary">
          {isNew ? "Artikel Baru" : "Edit Artikel"}
        </h2>
        <button
          onClick={() => guard(onCancel)}
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-secondary"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-5">
        <Field label="Judul">
          <input
            value={article.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Judul artikel"
            className={fieldBase}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Slug (URL)">
          <input
            value={article.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="otomatis dari judul bila kosong"
            className={fieldBase}
          />
          {!isNew && originalSlug && article.slug !== originalSlug && (
            <span className="text-xs text-amber-600">
              Slug lama <code>/{originalSlug}</code> akan redirect permanen (301) ke slug baru.
            </span>
          )}
        </Field>
          <Field label="Penulis">
            <input
              value={article.author}
              onChange={(e) => set("author", e.target.value)}
              className={fieldBase}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Kategori">
            <select
              value={article.category}
              onChange={(e) => set("category", e.target.value)}
              className={fieldBase}
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!ARTICLE_CATEGORIES.includes(
                article.category as (typeof ARTICLE_CATEGORIES)[number],
              ) && (
                <option value={article.category}>{article.category}</option>
              )}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={article.status}
              onChange={(e) =>
                set("status", e.target.value as Article["status"])
              }
              className={fieldBase}
            >
              <option value="published">Terbit</option>
              <option value="draft">Draft</option>
            </select>
          </Field>
          <Field label="Tanggal terbit">
            <input
              type="date"
              value={article.publishedAt.slice(0, 10)}
              onChange={(e) => {
                if (!e.target.value) return;
                // Tanggal dianggap WIB (+07:00), konsisten dengan jadwal.
                set("publishedAt", new Date(`${e.target.value}T00:00:00+07:00`).toISOString());
              }}
              className={fieldBase}
            />
          </Field>
        </div>

        <Field label="Ringkasan (excerpt)">
          <textarea
            rows={2}
            value={article.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="Ringkasan singkat untuk kartu & SEO"
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <div className="grid gap-5 lg:grid-cols-2">
          <CoverUploader
            value={article.coverImage ?? ""}
            onChange={(url) => set("coverImage", url)}
            onAlt={(alt) => set("coverAlt", alt)}
          />
          <Field label="...atau tempel URL gambar (opsional)">
            <input
              value={article.coverImage ?? ""}
              onChange={(e) => set("coverImage", e.target.value)}
              placeholder="https://res.cloudinary.com/..."
              className={fieldBase}
            />
            <span className="text-xs text-muted">
              Bisa unggah langsung di samping, atau tempel URL gambar di sini.
            </span>
          </Field>
        </div>

        <Field label="Teks alternatif sampul (alt)">
          <input
            value={article.coverAlt ?? ""}
            onChange={(e) => set("coverAlt", e.target.value)}
            placeholder="Deskripsi gambar untuk a11y/SEO (opsional)"
            className={fieldBase}
          />
        </Field>

        <BodyEditor
          value={article.body}
          onChange={(body) => set("body", body)}
        />

        <Field label="Tags">
          <TagInput value={article.tags} onChange={(tags) => set("tags", tags)} />
        </Field>

        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Judul SEO (opsional)">
            <input
              value={article.metaTitle ?? ""}
              onChange={(e) => set("metaTitle", e.target.value)}
              placeholder="Kosong = pakai judul artikel"
              className={fieldBase}
            />
            <CharHint value={article.metaTitle ?? ""} min={30} max={60} />
          </Field>
          <Field label="Deskripsi SEO (opsional)">
            <textarea
              rows={2}
              value={article.metaDescription ?? ""}
              onChange={(e) => set("metaDescription", e.target.value)}
              placeholder="Kosong = pakai ringkasan"
              className={cn(fieldBase, "resize-none")}
            />
            <CharHint value={article.metaDescription ?? ""} min={70} max={160} />
          </Field>
        </div>

        <Field label="Jadwal terbit (WIB, opsional)">
          <input
            type="datetime-local"
            value={isoToWibInput(article.scheduledAt)}
            onChange={(e) => {
              const iso = wibInputToIso(e.target.value);
              if (iso === null) return;
              set("scheduledAt", iso || undefined);
            }}
            className={fieldBase}
          />
          <span className="text-xs text-muted">
            Kosongkan untuk langsung tayang. Jadwal di masa depan disembunyikan
            dari publik sampai waktunya tiba.
          </span>
        </Field>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Artikel
        </button>
        <button
          onClick={() => guard(onCancel)}
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          Batal
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">{label}</span>
      {children}
    </label>
  );
}

/**
 * Ekstrak `publicId` Cloudinary dari URL secure.
 * Mengembalikan "" bila URL bukan dari Cloudinary (mis. URL eksternal).
 */
/** Input tag berbentuk chip: Enter/koma untuk menambah, Backspace untuk hapus terakhir (B3.5). */
function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const merged = Array.from(new Set([...value, ...parts])).slice(0, 30);
    onChange(merged);
    setDraft("");
  };

  return (
    <div className={cn(fieldBase, "flex flex-wrap items-center gap-2")}>
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Hapus tag ${t}`}
            className="grid h-4 w-4 place-items-center rounded-full hover:bg-primary/10"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "Tambah tag..." : "Ketik tag lalu Enter"}
        aria-label="Tambah tag"
        className="min-w-[140px] flex-1 bg-transparent py-0.5 text-sm text-secondary placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

/** Penghitung karakter dengan rentang rekomendasi (B3.6). */
function CharHint({ value, min, max }: { value: string; min: number; max: number }) {
  const status = lengthStatus(value.length, min, max);
  const tone =
    status === "ok" ? "text-emerald-600" : status === "kosong" ? "text-muted" : "text-amber-600";
  const note =
    status === "kosong"
      ? "Opsional"
      : status === "ok"
        ? "Panjang ideal"
        : status === "pendek"
          ? `Terlalu pendek (ideal ${min}-${max})`
          : `Terlalu panjang (ideal ${min}-${max})`;
  return (
    <span className={cn("text-xs", tone)} aria-live="polite">
      {value.length} karakter · {note}
    </span>
  );
}

/** Catat unggahan dari form artikel ke library Media (B1.2). */
async function registerBlogMedia(asset: CloudinaryAsset, title: string) {
  await saveMedia({
    publicId: asset.publicId,
    secureUrl: asset.secureUrl,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    bytes: asset.bytes,
    category: "blog",
    title,
    projectSlug: "",
  });
}

/**
 * Editor isi artikel: toolbar + pratinjau (MarkdownEditor). Sisip gambar dari
 * media library di posisi kursor, dengan alt wajib (B1.4) dan pilihan lebar (B1.5).
 */
function BodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (body: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [wide, setWide] = useState(false);
  const [pending, setPending] = useState<MediaItem | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  // Callback sisip dari editor; dipanggil setelah alt & sumber siap.
  const insertRef = useRef<((snippet: string) => void) | null>(null);

  const onRequestImage = (insert: (snippet: string) => void) => {
    insertRef.current = insert;
    setPickerOpen(true);
  };

  const onPicked = (sel: MediaItem[]) => {
    const it = sel[0];
    if (!it) return;
    setPending(it);
    setAlt(it.alt || it.title || "");
    setWide(false);
    setInlineError(null);
  };

  const insert = () => {
    if (!pending) return;
    const snippet = buildImageSnippet(alt, pending.secureUrl, wide);
    if (!snippet) {
      setInlineError("Teks alternatif wajib diisi dan sumber gambar harus dari Cloudinary.");
      return;
    }
    insertRef.current?.(snippet);
    insertRef.current = null;
    setPending(null);
    setAlt("");
    setInlineError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-secondary">Isi artikel</span>

      <MarkdownEditor
        value={value}
        onChange={onChange}
        onRequestImage={onRequestImage}
        placeholder={"Tulis isi artikel di sini...\n\n## Subjudul\n\n- Poin satu\n- Poin dua\n\n**Tebal** dan *miring*."}
        fieldClass={fieldBase}
      />

      {pending && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary-50/40 p-3">
          <div className="flex items-center gap-3">
            <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
              <Image src={pending.secureUrl} alt="" fill sizes="80px" className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold text-secondary" htmlFor="inline-alt">
                Teks alternatif (wajib)
              </label>
              <input
                id="inline-alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Deskripsi gambar"
                className={fieldBase}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-secondary">
              <input type="checkbox" checked={wide} onChange={(e) => setWide(e.target.checked)} />
              Lebar penuh (wide)
            </label>
            <button
              type="button"
              onClick={insert}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
            >
              Sisipkan di kursor
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="text-xs font-semibold text-slate-500 hover:text-secondary"
            >
              Batal
            </button>
          </div>
          {inlineError && <span className="text-xs text-rose-500">{inlineError}</span>}
        </div>
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="single"
        title="Sisipkan gambar"
        folder="lktech/blog"
        onSelect={onPicked}
      />
    </div>
  );
}
function publicIdFromUrl(url: string): string {
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return "";
  let path = url.slice(idx + marker.length);
  // Buang segmen transformasi (mis. "f_auto,q_auto/" atau "c_fill,w_800/").
  path = path.replace(/^(?:[^/]*,)?[a-z]+_[^/]*\//, "");
  path = path.replace(/^v\d+\//, "");
  return path.replace(/\.[a-z0-9]+$/i, "");
}

/**
 * Pembungkus `ImageUploader` yang menyimpan hasil unggah sebagai string URL
 * pada field `coverImage` artikel (bukan objek CloudinaryAsset).
 */
function CoverUploader({
  value,
  onChange,
  onAlt,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Adopsi alt dari media terpilih (B1.1) agar tidak hilang. */
  onAlt?: (alt: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const asset: CloudinaryAsset | null = value
    ? {
        publicId: publicIdFromUrl(value),
        secureUrl: value,
        width: 0,
        height: 0,
        format: "",
        bytes: 0,
        createdAt: "",
      }
    : null;

  // Sampul bisa dipakai artikel lain atau berasal dari media library, jadi
  // berkas lama TIDAK dihapus dari Cloudinary di sini. Pembersihan aman
  // dilakukan lewat halaman media (orphans) yang memeriksa pemakaian.
  const handleChange = (next: CloudinaryAsset | null) => {
    onChange(next?.secureUrl ?? "");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">
        Gambar sampul (unggah)
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
        >
          Pilih dari media
        </button>
      </div>
      <ImageUploader
        value={asset}
        onChange={handleChange}
        folder="lktech/blog"
        label="Atau unggah gambar baru"
        removeRemote={false}
        registerMedia={(asset) => registerBlogMedia(asset, "Sampul artikel")}
      />
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="single"
        title="Pilih sampul artikel"
        folder="lktech/blog"
        onSelect={(sel) => {
          const it = sel[0];
          if (!it) return;
          onChange(it.secureUrl);
          if (onAlt && (it.alt || it.title)) onAlt(it.alt || it.title);
        }}
      />
      {value && !publicIdFromUrl(value) && (
        <span className="text-xs text-amber-600">
          Sampul memakai URL eksternal. Berkas di Cloudinary tidak terkelola
          dari sini.
        </span>
      )}
      {!value && (
        <span className="text-xs text-muted">
          Rasio disarankan 16:9 (mis. 1600Ã—900).
        </span>
      )}
    </div>
  );
}
