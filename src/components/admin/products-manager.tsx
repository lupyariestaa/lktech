"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ExternalLink,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteProduct,
  fetchProducts,
  saveProduct,
} from "@/lib/admin-api";
import type { Product, StoredProduct } from "@/lib/product-types";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABEL,
} from "@/lib/product-types";
import { formatPrice } from "@/lib/product-format";
import { useAsyncList } from "@/components/admin/use-async-list";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

const emptyProduct: Product = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  category: "template",
  price: 0,
  originalPrice: undefined,
  cover: "default",
  gallery: [],
  badge: undefined,
  features: [],
  specs: [],
  tools: [],
  includes: [],
  delivery: "",
  soldOut: false,
  featured: false,
  active: true,
  waMessage: undefined,
};

export function ProductsManager() {
  const toast = useToast();
  const {
    data: items,
    setData: setItems,
    loading,
    error,
    setError,
    reload: load,
  } = useAsyncList<StoredProduct>(fetchProducts, "Gagal memuat produk.");
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<StoredProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useRegisterDirty(editing !== null);

  const refresh = async () => {
    await load();
  };

  const onNew = () => {
    setEditing({ ...emptyProduct });
    setIsNew(true);
    setError(null);
  };

  const onEdit = (p: StoredProduct) => {
    const { id: _id, ...rest } = p;
    void _id;
    setEditing({ ...rest });
    setIsNew(false);
    setError(null);
  };

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    const prev = items;
    setItems((ls) => ls.filter((l) => l.slug !== target.slug));
    try {
      await deleteProduct(target.slug);
      setToDelete(null);
      toast.success(`Produk "${target.name}" dihapus.`);
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
    if (!editing.name.trim()) {
      const msg = "Nama produk wajib diisi.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!Number.isFinite(editing.price) || editing.price < 0) {
      const msg = "Harga tidak boleh negatif.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (
      editing.originalPrice != null &&
      editing.originalPrice !== 0 &&
      editing.originalPrice < editing.price
    ) {
      const msg = "Harga sebelum diskon harus lebih besar dari harga jual.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveProduct(editing);
      setEditing(null);
      await load({ silent: true });
      toast.success(isNew ? "Produk dibuat." : "Produk diperbarui.");
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
      <ProductForm
        product={editing}
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
        <p className="text-sm text-muted">{items.length} produk</p>
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
            Produk Baru
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
          <span className="text-sm">Memuat produk...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">Belum ada produk.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((p) => (
            <div
              key={p.slug}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                {p.cover && p.cover !== "default" ? (
                  <Image
                    src={p.cover}
                    alt={p.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-primary">
                    {PRODUCT_CATEGORY_LABEL[p.category]}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{formatPrice(p.price)}</span>
                  {!p.active && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-amber-600">
                        Nonaktif
                      </span>
                    </>
                  )}
                  {p.featured && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-primary">Unggulan</span>
                    </>
                  )}
                  {p.soldOut && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-rose-500">
                        Stok habis
                      </span>
                    </>
                  )}
                </div>
                <h3 className="mt-0.5 truncate text-sm font-bold text-secondary">
                  {p.name}
                </h3>
                <p className="truncate text-xs text-muted">/{p.slug}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/produk/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Lihat di website"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => onEdit(p)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(p)}
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
        title="Hapus produk ini?"
        description={`"${toDelete?.name}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function ProductForm({
  product,
  isNew,
  saving,
  onChange,
  onSave,
  onCancel,
  error,
}: {
  product: Product;
  isNew: boolean;
  saving: boolean;
  onChange: (p: Product) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { guard, dialogProps } = useUnsavedChanges(true);

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    onChange({ ...product, [key]: value });

  const setList = (key: "tools" | "includes" | "gallery", value: string) =>
    set(
      key,
      value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-secondary">
          {isNew ? "Produk Baru" : "Edit Produk"}
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
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nama Produk">
            <input
              value={product.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nama produk"
              className={fieldBase}
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              value={product.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="otomatis dari nama bila kosong"
              className={fieldBase}
            />
          </Field>
        </div>

        <Field label="Tagline singkat">
          <input
            value={product.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="Kalimat singkat yang menarik"
            className={fieldBase}
          />
        </Field>

        <Field label="Deskripsi">
          <textarea
            rows={4}
            value={product.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Deskripsi lengkap produk"
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Kategori">
            <select
              value={product.category}
              onChange={(e) =>
                set("category", e.target.value as Product["category"])
              }
              className={fieldBase}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Harga (Rp)">
            <input
              type="number"
              value={product.price}
              onChange={(e) => set("price", Number(e.target.value))}
              className={fieldBase}
            />
          </Field>
          <Field label="Harga sebelum diskon (opsional)">
            <input
              type="number"
              value={product.originalPrice ?? ""}
              onChange={(e) =>
                set(
                  "originalPrice",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className={fieldBase}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Badge (opsional)">
            <input
              value={product.badge ?? ""}
              onChange={(e) => set("badge", e.target.value || undefined)}
              placeholder="mis. Terlaris"
              className={fieldBase}
            />
          </Field>
          <Field label="Pengiriman / pengerjaan">
            <input
              value={product.delivery ?? ""}
              onChange={(e) => set("delivery", e.target.value || undefined)}
              placeholder="mis. Instan (download)"
              className={fieldBase}
            />
          </Field>
        </div>

        {/* Cover */}
        <div className="rounded-2xl border border-slate-200 bg-surface p-5">
          <p className="text-sm font-semibold text-secondary">Gambar Cover</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {product.cover && product.cover !== "default" ? (
                <Image
                  src={product.cover}
                  alt="Cover"
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-300">
                  <ImageIcon className="h-6 w-6" />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
              >
                <ImageIcon className="h-4 w-4" />
                Pilih dari Media
              </button>
              {product.cover !== "default" && (
                <button
                  onClick={() => set("cover", "default")}
                  className="text-xs font-semibold text-muted hover:text-rose-500"
                >
                  Hapus cover
                </button>
              )}
            </div>
          </div>
        </div>

        <Field label="Galeri gambar (1 URL per baris)">
          <textarea
            rows={3}
            value={product.gallery.join("\n")}
            onChange={(e) => setList("gallery", e.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <Field label="Fitur utama (format: Judul | Deskripsi, 1 per baris)">
          <textarea
            rows={4}
            value={product.features
              .map((f) => `${f.title} | ${f.description}`)
              .join("\n")}
            onChange={(e) =>
              set(
                "features",
                e.target.value
                  .split("\n")
                  .map((line) => {
                    const [title, description] = line.split("|");
                    return {
                      title: (title ?? "").trim(),
                      description: (description ?? "").trim(),
                    };
                  })
                  .filter((f) => f.title),
              )
            }
            placeholder={"Desain Modern | Tampilan clean & profesional"}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <Field label="Spesifikasi (format: Label = Nilai, 1 per baris)">
          <textarea
            rows={4}
            value={product.specs.map((s) => `${s.label} = ${s.value}`).join("\n")}
            onChange={(e) =>
              set(
                "specs",
                e.target.value
                  .split("\n")
                  .map((line) => {
                    const [label, value] = line.split("=");
                    return {
                      label: (label ?? "").trim(),
                      value: (value ?? "").trim(),
                    };
                  })
                  .filter((s) => s.label && s.value),
              )
            }
            placeholder={"Teknologi = Next.js\nBentuk = Source code"}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tools / Teknologi (1 per baris)">
            <textarea
              rows={4}
              value={product.tools.join("\n")}
              onChange={(e) => setList("tools", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>
          <Field label="Yang didapat (1 per baris)">
            <textarea
              rows={4}
              value={product.includes.join("\n")}
              onChange={(e) => setList("includes", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>
        </div>

        <Field label="Pesan WhatsApp khusus (opsional)">
          <textarea
            rows={2}
            value={product.waMessage ?? ""}
            onChange={(e) => set("waMessage", e.target.value || undefined)}
            placeholder="Biarkan kosong agar sistem menyusun pesan otomatis"
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <div className="flex flex-wrap gap-5 rounded-2xl border border-slate-200 bg-surface p-5">
          <Toggle
            label="Aktif (tampil di halaman publik)"
            checked={product.active}
            onChange={(v) => set("active", v)}
          />
          <Toggle
            label="Unggulan (tampil di depan)"
            checked={product.featured}
            onChange={(v) => set("featured", v)}
          />
          <Toggle
            label="Stok habis"
            checked={product.soldOut}
            onChange={(v) => set("soldOut", v)}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Produk
        </button>
        <button
          onClick={() => guard(onCancel)}
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          Batal
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="single"
        title="Pilih cover produk"
        onSelect={(sel) => {
          if (sel[0]) {
            set("cover", sel[0].secureUrl);
            set("coverPublicId", sel[0].publicId);
          }
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
      />
      <span className="text-sm font-medium text-secondary">{label}</span>
    </label>
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
