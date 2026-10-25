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
      finishing: config.finishingOptions
        .filter((option) => finishingIds.includes(option.id))
        .map(({ id, name }) => ({ id, name })),
    }, price, quantity));
    router.push("/keranjang");
  };

  return (
    <div className={cn(
      "grid min-w-0 gap-5",
      compact
        ? "max-w-none"
        : "max-w-xl rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6",
    )}>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-secondary">Pilih bahan <span className="font-normal text-muted">({variants.length} bahan)</span></legend>
        <div className="grid gap-2">
          {variants.map((item) => {
            const selected = item.slug === variantSlug;
            const materialPrice = item.printPricing?.method === "area" ? `${formatPrice(item.printPricing.ratePerM2)} / m²` : item.printPricing?.method === "sheet" ? `${formatPrice(item.printPricing.pricePerSheet)} / lembar` : "";
            return <button key={item.slug} type="button" aria-pressed={selected} onClick={() => setVariantSlug(item.slug)} className={cn("grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition sm:gap-3 sm:px-4", selected ? "border-primary bg-primary-50" : "border-slate-200 bg-white hover:border-primary/40")}>
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white")}>{selected && <span aria-hidden="true" className="text-xs">✓</span>}</span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-secondary">{item.name}</span>
              <span className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums text-secondary sm:text-sm">{materialPrice}</span>
            </button>;
          })}
        </div>
      </fieldset>
      {pricing?.method === "area" && <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-secondary">Ukuran banner <span className="font-normal text-muted">(m)</span></legend>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
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
      {config.finishingOptions.length > 0 && <label className="grid gap-1.5 text-sm font-semibold text-secondary">
        Finishing banner <span className="text-xs font-normal text-muted">Pilih satu, tanpa biaya tambahan</span>
        <select
          className={field}
          value={finishingIds[0] ?? ""}
          onChange={(event) => setFinishingIds(event.target.value ? [event.target.value] : [])}
        >
          <option value="">Tanpa finishing khusus</option>
          {config.finishingOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>}
      <label className={cn("grid gap-1.5 text-xs font-medium text-muted", compact ? "grid-cols-[minmax(0,1fr)_7rem] items-center" : "max-w-56")}>
        <span>Jumlah banner</span>
        <input className={field} type="number" min="1" max="999" step="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(999, Math.floor(Number(event.target.value) || 1))))} />
      </label>
      <div className={cn("min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4", compact && "bg-white")}>
        <p className="text-xs text-muted">Estimasi per banner</p>
        <p className="mt-1 break-words text-lg font-bold leading-tight text-secondary sm:text-xl">{price === null || !areaValid ? "Masukkan ukuran valid" : formatPrice(price)}</p>
        {pricing?.method === "area" && price !== null && areaValid && <p className="mt-1 text-xs text-muted">{width} × {height} m × {formatPrice(pricing.ratePerM2)} / m²</p>}
        {quantity > 1 && price !== null && <p className="mt-2 text-sm font-semibold text-primary">Total {quantity} banner: {formatPrice(price * quantity)}</p>}
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button type="button" onClick={submit} className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Tambah ke keranjang</button>
    </div>
  );
}
