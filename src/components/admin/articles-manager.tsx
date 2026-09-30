"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "@/lib/admin-api";
import { ARTICLE_CATEGORIES, type Article, type StoredArticle } from "@/lib/article-types";
import { ImageUploader } from "@/components/admin/image-uploader";
import { useAsyncList } from "@/components/admin/use-async-list";
import { useToast } from "@/components/admin/toast";
import { deleteImage, type CloudinaryAsset } from "@/lib/cloudinary-client";
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

  const onDelete = async (slug: string, title: string) => {
    if (!confirm(`Hapus artikel "${title}"? Tindakan ini permanen.`)) return;
    const prev = items;
    setItems((ls) => ls.filter((l) => l.slug !== slug));
    try {
      await deleteArticle(slug);
      toast.success(`Artikel "${title}" dihapus.`);
    } catch (err) {
      setItems(prev);
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      setError(msg);
      toast.error(msg);
    }
  };

  const onSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveArticle(editing);
      setEditing(null);
      await load();
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
                  onClick={() => onDelete(a.slug, a.title)}
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-secondary">
          {isNew ? "Artikel Baru" : "Edit Artikel"}
        </h2>
        <button
          onClick={onCancel}
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

        <Field label="Isi artikel (Markdown)">
          <textarea
            rows={16}
            value={article.body}
            onChange={(e) => set("body", e.target.value)}
            placeholder={"Tulis isi artikel di sini...\n\n## Subjudul\n\n- Poin satu\n- Poin dua\n\n**Tebal** dan *miring*."}
            className={cn(fieldBase, "resize-y font-mono text-xs leading-relaxed")}
          />
          <span className="text-xs text-muted">
            Format didukung: <code>## Judul</code>, <code>- daftar</code>,{" "}
            <code>**tebal**</code>, <code>*miring*</code>,{" "}
            <code>[tautan](url)</code>, <code>---</code>
          </span>
        </Field>

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
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          Batal
        </button>
      </div>
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
}: {
  value: string;
  onChange: (url: string) => void;
}) {
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

  const handleChange = async (next: CloudinaryAsset | null) => {
    // Saat gambar diganti/dihapus, hapus aset lama dari Cloudinary bila ada.
    if (value && next?.secureUrl !== value) {
      const oldId = publicIdFromUrl(value);
      if (oldId && oldId !== next?.publicId) {
        try {
          await deleteImage(oldId);
        } catch {
          /* abaikan: aset mungkin sudah tidak ada */
        }
      }
    }
    onChange(next?.secureUrl ?? "");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">
        Gambar sampul (unggah)
      </span>
      <ImageUploader
        value={asset}
        onChange={handleChange}
        folder="lktech/blog"
        label="Pilih gambar sampul"
      />
      {value && !publicIdFromUrl(value) && (
        <span className="text-xs text-amber-600">
          Sampul memakai URL eksternal — hapus tidak akan menghapus berkas di
          Cloudinary.
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
