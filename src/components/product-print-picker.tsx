"use client";

import { useState } from "react";
import type { Product } from "@/lib/product-types";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { calculatePrintUnitPrice, formatPrice } from "@/lib/product-format";
import { toPrintCartItem } from "@/lib/cart";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProductPrintPicker({ product, compact = false }: { product: Product; compact?: boolean }) {
  const config = product.printConfig;
  const variants = product.variants.filter((variant) => variant.printPricing);
  const [selectedVariantSlug, setVariantSlug] = useState(variants[0]?.slug ?? "");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [finishingIds, setFinishingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const variantSlug = variants.some((item) => item.slug === selectedVariantSlug)
    ? selectedVariantSlug
    : variants[0]?.slug ?? "";
  const variant = variants.find((item) => item.slug === variantSlug);
  const pricing = variant?.printPricing;
  const areaOptions = pricing?.method === "area"
    ? { widthM: Number(width), heightM: Number(height) }
    : {};
  const widthM = areaOptions.widthM;
  const heightM = areaOptions.heightM;
  const price = config && pricing
    ? calculatePrintUnitPrice(pricing, config, { widthM, heightM })
    : null;

  if (!config || variants.length === 0) {
    return <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Konfigurasi cetak belum lengkap.</p>;
  }

  const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";
  const areaValid = pricing?.method !== "area" || (
    Number.isFinite(widthM) && Number.isFinite(heightM) &&
    Math.round(widthM! * 100) === widthM! * 100 && Math.round(heightM! * 100) === heightM! * 100
  );
  const toggleFinishing = (id: string) => setFinishingIds((current) =>
    current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
  );
  const submit = () => {
    if (!variant || price === null || !areaValid) {
      setError("Pilih varian dan isi ukuran yang valid.");
      return;
    }
    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(`/produk/${product.slug}`)}`);
      return;
    }
    setError("");
    add(toPrintCartItem(product, variant, {
      ...(pricing?.method === "area" ? { widthM: Number(width), heightM: Number(height) } : {}),
      finishingIds,
    }, price, quantity));
    router.push("/keranjang");
  };

  return (
    <div className={cn("grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6", compact ? "max-w-none" : "max-w-xl")}>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-secondary">Pilih bahan <span className="font-normal text-muted">({variants.length} bahan)</span></legend>
        <div className="grid gap-2">
          {variants.map((item) => {
            const selected = item.slug === variantSlug;
            const materialPrice = item.printPricing?.method === "area" ? `${formatPrice(item.printPricing.ratePerM2)} / m²` : item.printPricing?.method === "sheet" ? `${formatPrice(item.printPricing.pricePerSheet)} / lembar` : "";
            return <button key={item.slug} type="button" aria-pressed={selected} onClick={() => setVariantSlug(item.slug)} className={cn("flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition", selected ? "border-primary bg-primary-50" : "border-slate-200 bg-white hover:border-primary/40")}>
              <span className="flex min-w-0 items-center gap-3">
                <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white")}>{selected && <span aria-hidden="true" className="text-xs">✓</span>}</span>
                <span className="text-sm font-semibold text-secondary">{item.name}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-secondary">{materialPrice}</span>
            </button>;
          })}
        </div>
      </fieldset>
      {pricing?.method === "area" && <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-secondary">Ukuran banner <span className="font-normal text-muted">(m)</span></legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-xs font-medium text-muted">Lebar
            <input className={field} type="number" inputMode="decimal" min={config.minWidthM} max={config.maxWidthM} step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted">Tinggi
            <input className={field} type="number" inputMode="decimal" min={config.minHeightM} max={config.maxHeightM} step="0.01" value={height} onChange={(event) => setHeight(event.target.value)} />
          </label>
        </div>
        <p className="text-xs text-muted">Batas ukuran: {config.minWidthM}–{config.maxWidthM} m lebar, {config.minHeightM}–{config.maxHeightM} m tinggi.</p>
      </fieldset>}
      {pricing?.method === "sheet" && <p className="text-sm text-muted">{pricing.description || "Harga per lembar"}</p>}
      {config.finishingOptions.length > 0 && <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-secondary">Finishing <span className="font-normal text-muted">(tanpa biaya)</span></legend>
        {config.finishingOptions.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={finishingIds.includes(option.id)} onChange={() => toggleFinishing(option.id)} />{option.name}
        </label>)}
      </fieldset>}
      <label className="grid max-w-40 gap-1.5 text-xs font-medium text-muted">Jumlah banner
        <input className={field} type="number" min="1" max="999" step="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(999, Math.floor(Number(event.target.value) || 1))))} />
      </label>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-muted">Estimasi per banner</p>
        <p className="mt-1 text-xl font-bold text-secondary">{price === null || !areaValid ? "Masukkan ukuran valid" : formatPrice(price)}</p>
        {pricing?.method === "area" && price !== null && areaValid && <p className="mt-1 text-xs text-muted">{width} × {height} m × {formatPrice(pricing.ratePerM2)} / m²</p>}
        {quantity > 1 && price !== null && <p className="mt-2 text-sm font-semibold text-primary">Total {quantity} banner: {formatPrice(price * quantity)}</p>}
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button type="button" onClick={submit} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark">Tambah ke keranjang</button>
    </div>
  );
}
