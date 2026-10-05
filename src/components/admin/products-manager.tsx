"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
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
import type {
  Product,
  ProductDownloadable,
  ProductDownloadFile,
  StoredProduct,
} from "@/lib/product-types";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABEL,
  type ProductProcessStep,
  type ProductVariant,
} from "@/lib/product-types";
import {
  hasVariants,
  productPriceLabel,
} from "@/lib/product-format";
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
  process: [],
  notes: [],
  variants: [],
  soldOut: false,
  featured: false,
  active: true,
  downloadable: undefined,
  relatedSlugs: [],
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

    const multi = hasVariants(editing);

    if (multi) {
      // ===== Validasi produk multi-varian =====
      const slugs = new Set<string>();
      let highlightCount = 0;
      for (const v of editing.variants) {
        if (!v.name.trim()) {
          const msg = "Setiap paket wajib punya nama.";
          setError(msg);
          toast.error(msg);
          return;
        }
        if (!v.slug.trim()) {
          const msg = `Slug paket "${v.name}" kosong.`;
          setError(msg);
          toast.error(msg);
          return;
        }
        if (slugs.has(v.slug)) {
          const msg = `Slug paket "${v.slug}" duplikat.`;
          setError(msg);
          toast.error(msg);
          return;
        }
        slugs.add(v.slug);
        if (!Number.isFinite(v.price) || v.price < 0) {
          const msg = `Harga paket "${v.name}" tidak valid.`;
          setError(msg);
          toast.error(msg);
          return;
        }
        if (
          v.originalPrice != null &&
          v.originalPrice !== 0 &&
          v.originalPrice < v.price
        ) {
          const msg = `Harga coret paket "${v.name}" harus lebih besar dari harga jual.`;
          setError(msg);
          toast.error(msg);
          return;
        }
        if (v.highlight) highlightCount += 1;
      }
      if (highlightCount > 1) {
        const msg = "Hanya boleh satu paket ditandai 'Paling Populer'.";
        setError(msg);
        toast.error(msg);
        return;
      }
    } else {
      // ===== Validasi produk tunggal (seperti sebelumnya) =====
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
        allProducts={items}
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
                  <span>{productPriceLabel(p)}</span>
                  {hasVariants(p) && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-primary">
                        {p.variants.length} paket
                      </span>
                    </>
                  )}
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
  allProducts,
  onChange,
  onSave,
  onCancel,
  error,
}: {
  product: Product;
  isNew: boolean;
  saving: boolean;
  allProducts: StoredProduct[];
  onChange: (p: Product) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const { guard, dialogProps } = useUnsavedChanges(true);

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    onChange({ ...product, [key]: value });

  const setList = (
    key: "tools" | "includes" | "notes",
    value: string,
  ) =>
    set(
      key,
      value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );

  // ===== Galeri (via MediaPicker multiple) =====
  const addGalleryUrls = (urls: string[]) =>
    set("gallery", Array.from(new Set([...product.gallery, ...urls])));

  const removeGalleryAt = (i: number) =>
    set(
      "gallery",
      product.gallery.filter((_, idx) => idx !== i),
    );

  const moveGallery = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= product.gallery.length) return;
    const next = [...product.gallery];
    [next[i], next[j]] = [next[j], next[i]];
    set("gallery", next);
  };

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
                  alt={product.coverAlt || "Cover produk"}
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
          <div className="mt-4">
            <Field label="Teks alternatif cover (alt)">
              <input
                value={product.coverAlt ?? ""}
                onChange={(e) => set("coverAlt", e.target.value)}
                placeholder="Deskripsi gambar untuk a11y/SEO"
                className={fieldBase}
              />
            </Field>
          </div>
        </div>

        {/* Galeri (via MediaPicker multiple) */}
        <div className="rounded-2xl border border-slate-200 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-secondary">
                Galeri gambar
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Pilih beberapa gambar sekaligus dari Media (rasio disarankan
                16:9).
              </p>
            </div>
            <button
              onClick={() => setGalleryPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <ImageIcon className="h-4 w-4" />
              Pilih dari Media
            </button>
          </div>

          {product.gallery.length === 0 ? (
            <button
              onClick={() => setGalleryPickerOpen(true)}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-muted transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ImageIcon className="h-6 w-6" />
              <span className="text-sm font-medium">
                Belum ada gambar galeri. Klik untuk memilih.
              </span>
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {product.gallery.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <Image
                    src={url}
                    alt={`Galeri ${i + 1}`}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveGallery(i, -1)}
                        disabled={i === 0}
                        aria-label="Geser ke kiri"
                        className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-600 hover:text-primary disabled:opacity-40"
                      >
                        <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGallery(i, 1)}
                        disabled={i === product.gallery.length - 1}
                        aria-label="Geser ke kanan"
                        className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-600 hover:text-primary disabled:opacity-40"
                      >
                        <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGalleryAt(i)}
                      aria-label="Hapus gambar"
                      className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-rose-500 hover:bg-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                      Pertama
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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

        {/* ===== Paket / Varian ===== */}
        <VariantsEditor
          variants={product.variants}
          onChange={(variants) => set("variants", variants)}
        />

        {/* ===== Alur Pembuatan ===== */}
        <ProcessEditor
          steps={product.process}
          onChange={(process) => set("process", process)}
        />

        {/* ===== Unduhan otomatis (produk digital) ===== */}
        <DownloadableEditor
          value={product.downloadable}
          onChange={(v) => set("downloadable", v)}
        />

        {/* ===== Catatan Penting ===== */}
        <Field label="Catatan penting (1 per baris)">
          <textarea
            rows={4}
            value={product.notes.join("\n")}
            onChange={(e) => setList("notes", e.target.value)}
            placeholder={
              "Data identitas & referensi ditagih via WhatsApp.\nHasil akhir bersifat terima jadi."
            }
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <Field label="Pesan WhatsApp khusus (opsional)">
          <textarea
            rows={2}
            value={product.waMessage ?? ""}
            onChange={(e) => set("waMessage", e.target.value || undefined)}
            placeholder="Biarkan kosong agar sistem menyusun pesan otomatis"
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        {/* ===== Produk terkait / sering dibeli bersama (FASE P3) ===== */}
        <RelatedProductsEditor
          currentSlug={product.slug}
          value={product.relatedSlugs ?? []}
          options={allProducts}
          onChange={(slugs) =>
            set("relatedSlugs", slugs.length ? slugs : undefined)
          }
        />

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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">
              Sisa stok produk tunggal (opsional)
            </span>
            <input
              type="number"
              min={0}
              value={product.stock ?? ""}
              onChange={(e) =>
                set("stock", e.target.value === "" ? undefined : Number(e.target.value))
              }
              placeholder="mis. 3 → badge 'Sisa 3'"
              className={cn(fieldBase, "sm:w-52")}
            />
            <span className="text-[11px] text-muted">
              Kosongkan bila tak terbatas. Untuk multi-varian, isi stok di tiap paket.
            </span>
          </label>
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
        cropEnabled
        onSelect={(sel) => {
          if (sel[0]) {
            // PENTING: gunakan SATU onChange (bukan dua `set` berurutan) agar
            // perubahan tidak saling menimpa karena closure `product` yang basi.
            onChange({
              ...product,
              cover: sel[0].secureUrl,
              coverPublicId: sel[0].publicId,
              // Adopsi `alt` terkelola dari media (fallback ke judul).
              coverAlt: sel[0].alt || sel[0].title || product.coverAlt || "",
            });
          }
          setPickerOpen(false);
        }}
      />

      <MediaPickerDialog
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        mode="multiple"
        title="Pilih gambar galeri"
        cropEnabled
        onSelect={(items) => {
          addGalleryUrls(items.map((it) => it.secureUrl));
          setGalleryPickerOpen(false);
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

/* ================= Editor Varian / Paket ================= */

const emptyVariant: ProductVariant = {
  slug: "",
  name: "",
  tagline: "",
  price: 0,
  originalPrice: undefined,
  badge: undefined,
  highlight: false,
  soldOut: false,
  features: [],
  specs: [],
  includes: [],
  limits: [],
  delivery: "",
  waMessage: undefined,
};

function VariantsEditor({
  variants,
  onChange,
}: {
  variants: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
}) {
  const update = (i: number, patch: Partial<ProductVariant>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= variants.length) return;
    const next = [...variants];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">
            Paket / Varian ({variants.length})
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Isi bila produk punya beberapa paket dengan harga berbeda (mis.
            Basic, Profesional, Custom). Bila kosong, produk memakai harga
            tunggal di atas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...variants, structuredClone(emptyVariant)])}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Paket
        </button>
      </div>

      {variants.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {variants.map((v, i) => (
            <VariantCard
              key={i}
              index={i}
              total={variants.length}
              variant={v}
              onChange={(patch) => update(i, patch)}
              onRemove={() => onChange(variants.filter((_, j) => j !== i))}
              onMove={(dir) => move(i, dir)}
              onSetHighlight={() =>
                onChange(
                  variants.map((x, j) => ({ ...x, highlight: j === i })),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VariantCard({
  index,
  total,
  variant,
  onChange,
  onRemove,
  onMove,
  onSetHighlight,
}: {
  index: number;
  total: number;
  variant: ProductVariant;
  onChange: (patch: Partial<ProductVariant>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onSetHighlight: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">
          Paket #{index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Naikkan"
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Turunkan"
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Hapus paket"
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Nama paket">
          <input
            value={variant.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="mis. Portfolio Profesional"
            className={fieldBase}
          />
        </Field>
        <Field label="Slug paket (unik)">
          <input
            value={variant.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder="portfolio-profesional"
            className={fieldBase}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Tagline paket (opsional)">
          <input
            value={variant.tagline ?? ""}
            onChange={(e) => onChange({ tagline: e.target.value || undefined })}
            className={fieldBase}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Harga (Rp)">
          <input
            type="number"
            value={variant.price}
            onChange={(e) => onChange({ price: Number(e.target.value) })}
            className={fieldBase}
          />
        </Field>
        <Field label="Harga coret (opsional)">
          <input
            type="number"
            value={variant.originalPrice ?? ""}
            onChange={(e) =>
              onChange({
                originalPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={fieldBase}
          />
        </Field>
        <Field label="Estimasi pengerjaan (opsional)">
          <input
            value={variant.delivery ?? ""}
            onChange={(e) => onChange({ delivery: e.target.value || undefined })}
            placeholder="mis. 1-3 hari kerja"
            className={fieldBase}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Fitur paket (Judul | Deskripsi, 1 per baris)">
          <textarea
            rows={4}
            value={variant.features
              .map((f) => `${f.title} | ${f.description}`)
              .join("\n")}
            onChange={(e) =>
              onChange({
                features: e.target.value
                  .split("\n")
                  .map((line) => {
                    const [title, description] = line.split("|");
                    return {
                      title: (title ?? "").trim(),
                      description: (description ?? "").trim(),
                    };
                  })
                  .filter((f) => f.title),
              })
            }
            placeholder={"Domain gratis 1 tahun | Sudah termasuk\nResponsive | Optimal di semua perangkat"}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>
        <Field label="Spesifikasi paket (Label = Nilai, 1 per baris)">
          <textarea
            rows={4}
            value={variant.specs.map((s) => `${s.label} = ${s.value}`).join("\n")}
            onChange={(e) =>
              onChange({
                specs: e.target.value
                  .split("\n")
                  .map((line) => {
                    const [label, value] = line.split("=");
                    return {
                      label: (label ?? "").trim(),
                      value: (value ?? "").trim(),
                    };
                  })
                  .filter((s) => s.label && s.value),
              })
            }
            placeholder={"Hosting = Gratis 1 bulan\nHalaman = 1 halaman"}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Yang didapat (1 per baris)">
          <textarea
            rows={3}
            value={variant.includes.join("\n")}
            onChange={(e) =>
              onChange({
                includes: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className={cn(fieldBase, "resize-none")}
          />
        </Field>
        <Field label="Batasan paket (1 per baris)">
          <textarea
            rows={3}
            value={variant.limits.join("\n")}
            onChange={(e) =>
              onChange({
                limits: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={"Tidak termasuk penulisan konten\nMaks 1x revisi major"}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Badge (opsional)">
          <input
            value={variant.badge ?? ""}
            onChange={(e) => onChange({ badge: e.target.value || undefined })}
            placeholder="mis. Paling Populer"
            className={fieldBase}
          />
        </Field>
        <Field label="Pesan WhatsApp khusus (opsional)">
          <input
            value={variant.waMessage ?? ""}
            onChange={(e) => onChange({ waMessage: e.target.value || undefined })}
            className={fieldBase}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <Toggle
          label="Paling Populer (highlight)"
          checked={variant.highlight}
          onChange={onSetHighlight}
        />
        <Toggle
          label="Stok habis"
          checked={variant.soldOut}
          onChange={(v) => onChange({ soldOut: v })}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">
            Sisa stok paket (opsional)
          </span>
          <input
            type="number"
            min={0}
            value={variant.stock ?? ""}
            onChange={(e) =>
              onChange({
                stock: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="mis. 3"
            className={cn(fieldBase, "w-32")}
          />
        </label>
      </div>
    </div>
  );
}

/* ================= Editor Alur Pembuatan ================= */

function DownloadableEditor({
  value,
  onChange,
}: {
  value: ProductDownloadable | undefined;
  onChange: (v: ProductDownloadable | undefined) => void;
}) {
  const cfg: ProductDownloadable = value ?? { enabled: true, files: [] };
  const files = cfg.files ?? [];

  const update = (patch: Partial<ProductDownloadable>) =>
    onChange({ ...cfg, files, ...patch });

  const updateFile = (i: number, patch: Partial<ProductDownloadFile>) =>
    update({ files: files.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">
            Unduhan Otomatis (produk digital)
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Bila diisi, pembeli menerima link unduhan bertoken setelah pembayaran
            lunas. Kosongkan untuk produk non-digital / jasa.
          </p>
        </div>
        <Toggle
          label="Aktifkan unduhan"
          checked={cfg.enabled}
          onChange={(v) => update({ enabled: v })}
        />
      </div>

      {cfg.enabled && (
        <>
          <div className="mt-4 flex flex-col gap-3">
            {files.map((f, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={f.name}
                    onChange={(e) => updateFile(i, { name: e.target.value })}
                    placeholder="Nama berkas (mis. Template.zip)"
                    className={fieldBase}
                  />
                  <div className="flex gap-2">
                    <input
                      value={f.url}
                      onChange={(e) => updateFile(i, { url: e.target.value })}
                      placeholder="URL berkas (https://…)"
                      className={fieldBase}
                    />
                    <button
                      type="button"
                      onClick={() => update({ files: files.filter((_, j) => j !== i) })}
                      aria-label="Hapus berkas"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => update({ files: [...files, { name: "", url: "" }] })}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Berkas
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Masa berlaku link (hari, kosong = default)">
              <input
                type="number"
                min={0}
                value={cfg.linkDays ?? ""}
                onChange={(e) =>
                  update({ linkDays: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="30"
                className={fieldBase}
              />
            </Field>
            <Field label="Batas jumlah unduh (kosong = default)">
              <input
                type="number"
                min={0}
                value={cfg.maxDownloads ?? ""}
                onChange={(e) =>
                  update({
                    maxDownloads: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="5"
                className={fieldBase}
              />
            </Field>
          </div>

          <Field label="Catatan untuk pembeli (opsional)">
            <textarea
              rows={2}
              value={cfg.note ?? ""}
              onChange={(e) => update({ note: e.target.value || undefined })}
              placeholder="Mis. cara instalasi atau lisensi penggunaan."
              className={cn(fieldBase, "mt-3 resize-none")}
            />
          </Field>
        </>
      )}
        </div>
  );
}

/**
 * Editor "Produk terkait / sering dibeli bersama" (FASE P3).
 * Pilih dari produk lain (checkbox, dengan pencarian). Urutan pilih = urutan
 * tampil. Menyimpan slug saja ke `product.relatedSlugs`.
 */
function RelatedProductsEditor({
  currentSlug,
  value,
  options,
  onChange,
}: {
  currentSlug: string;
  value: string[];
  options: StoredProduct[];
  onChange: (slugs: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const candidates = options.filter(
    (p) => p.slug && p.slug !== currentSlug,
  );
  const q = query.trim().toLowerCase();
  const filtered = q
    ? candidates.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q),
      )
    : candidates;

  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else if (value.length < 12) {
      onChange([...value, slug]);
    }
  };

  const nameFor = (slug: string) =>
    options.find((p) => p.slug === slug)?.name ?? slug;

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5">
      <p className="text-sm font-semibold text-secondary">
        Sering dibeli bersama (produk terkait)
      </p>
      <p className="mt-0.5 text-xs text-muted">
        Pilih produk yang relevan. Akan tampil sebagai section &quot;Sering
        dibeli bersama&quot; di halaman produk ini (maks. 12).
      </p>

      {value.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {value.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                onClick={() => toggle(slug)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
                title="Klik untuk menghapus"
              >
                {nameFor(slug)}
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari produk…"
        className={cn(fieldBase, "mt-3")}
        aria-label="Cari produk terkait"
      />

      {candidates.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          Belum ada produk lain. Buat produk dulu untuk menautkannya.
        </p>
      ) : (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted">
              Tidak ada produk yang cocok.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const checked = value.includes(p.slug);
                return (
                  <li key={p.slug}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p.slug)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-secondary">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {PRODUCT_CATEGORY_LABEL[p.category]} · {p.slug}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessEditor({
  steps,
  onChange,
}: {
  steps: ProductProcessStep[];
  onChange: (s: ProductProcessStep[]) => void;
}) {
  const update = (i: number, patch: Partial<ProductProcessStep>) =>
    onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">
            Alur Pembuatan ({steps.length})
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Langkah-langkah cara memesan & menerima hasil produk.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([...steps, { step: String(steps.length + 1), title: "", description: "" }])
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Langkah
        </button>
      </div>

      {steps.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[90px_1fr_auto]">
                <input
                  value={s.step}
                  onChange={(e) => update(i, { step: e.target.value })}
                  placeholder="1"
                  className={fieldBase}
                  aria-label="Nomor langkah"
                />
                <input
                  value={s.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Judul langkah"
                  className={fieldBase}
                />
                <button
                  type="button"
                  onClick={() => onChange(steps.filter((_, j) => j !== i))}
                  aria-label="Hapus langkah"
                  className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={s.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Deskripsi langkah"
                className={cn(fieldBase, "mt-2 resize-none")}
              />
            </div>
          ))}
        </div>
      )}
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
