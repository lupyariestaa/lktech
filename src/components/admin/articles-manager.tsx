"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/media-types";
import { buildImageSnippet, insertBlock } from "@/lib/markdown-insert";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteArticle,
  fetchArticles,
  saveArticle,
  saveMedia,
} from "@/lib/admin-api";
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
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<StoredArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form terbuka → tandai ada perubahan belum disimpan (guard navigasi sidebar).
  useRegisterDirty(editing !== null);

  const refresh = async () => {
    await load();
  };

  const onNew = () => {
    setEditing({ ...emptyArticle });
    setIsNew(true);
  };

  const onEdit = (a: StoredArticle) => {
    const { id: _id, ...rest } = a;
    void _id;
    setEditing({ ...rest });
    setIsNew(false);
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

  const onSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      const msg = "Judul wajib diisi.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveArticle(editing);
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
      <ArticleForm
        article={editing}
        isNew={isNew}
        saving={saving}
        onChange={setEditing}
        onSave={onSave}
        onCancel={() => setEditing(null)}
        error={error}
      />
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

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat artikel...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">Belum ada artikel.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((a) => (
            <div
              key={a.slug}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-primary">{a.category}</span>
                  <span className="text-slate-300">•</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      a.status === "published"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600",
                    )}
                  >
                    {a.status === "published" ? "Terbit" : "Draft"}
                  </span>
                </div>
                <h3 className="mt-0.5 truncate text-sm font-bold text-secondary">
                  {a.title}
                </h3>
                <p className="truncate text-xs text-muted">/{a.slug}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/blog/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Lihat di website"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => onEdit(a)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(a)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
}: {
  article: Article;
  isNew: boolean;
  saving: boolean;
  onChange: (a: Article) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
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
              onChange={(e) =>
                set(
                  "publishedAt",
                  new Date(e.target.value || Date.now()).toISOString(),
                )
              }
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
          <Field label="…atau tempel URL gambar (opsional)">
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

        <Field label="Tags (1 per baris)">
          <textarea
            rows={3}
            value={article.tags.join("\n")}
            onChange={(e) =>
              set(
                "tags",
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className={cn(fieldBase, "resize-none")}
          />
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
 * Editor isi artikel (Markdown). Gambar disisipkan dari media library di
 * posisi kursor. Alt wajib (B1.4) dan pilihan lebar (B1.5).
 */
function BodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (body: string) => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [wide, setWide] = useState(false);
  const [pending, setPending] = useState<MediaItem | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const rememberCursor = () => {
    const el = areaRef.current;
    if (el) cursorRef.current = { start: el.selectionStart, end: el.selectionEnd };
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
      setInlineError(
        "Teks alternatif wajib diisi dan sumber gambar harus dari Cloudinary.",
      );
      return;
    }
    const { start, end } = cursorRef.current;
    const r = insertBlock(value, start, end, snippet);
    onChange(r.text);
    setPending(null);
    setAlt("");
    setInlineError(null);
    // Kembalikan fokus & kursor setelah sisipan.
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(r.cursor, r.cursor);
      cursorRef.current = { start: r.cursor, end: r.cursor };
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-secondary">Isi artikel (Markdown)</span>
        <button
          type="button"
          onClick={() => {
            rememberCursor();
            setPickerOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
        >
          Sisipkan gambar
        </button>
      </div>

      <textarea
        ref={areaRef}
        rows={16}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={rememberCursor}
        onKeyUp={rememberCursor}
        onClick={rememberCursor}
        placeholder={"Tulis isi artikel di sini...\n\n## Subjudul\n\n- Poin satu\n- Poin dua\n\n**Tebal** dan *miring*."}
        className={cn(fieldBase, "resize-y font-mono text-xs leading-relaxed")}
      />

      {pending && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary-50/40 p-3">
          <div className="flex items-center gap-3">
            <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
              <Image
                src={pending.secureUrl}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
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
              <input
                type="checkbox"
                checked={wide}
                onChange={(e) => setWide(e.target.checked)}
              />
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

      <span className="text-xs text-muted">
        Format: <code>## Judul</code>, <code>- daftar</code>, <code>1. daftar bernomor</code>,{" "}
        <code>&gt; kutipan</code>, <code>**tebal**</code>, <code>*miring*</code>,{" "}
        <code>`kode`</code>, <code>[tautan](url)</code>, <code>---</code>,{" "}
        <code>![alt](url)</code>.
      </span>

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
          Rasio disarankan 16:9 (mis. 1600×900).
        </span>
      )}
    </div>
  );
}
