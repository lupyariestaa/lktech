"use client";

import { useState } from "react";
import type { Product } from "@/lib/product-types";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { calculatePrintUnitPrice, formatPrice } from "@/lib/product-format";
import { toPrintCartItem } from "@/lib/cart";
import { useRouter } from "next/navigation";

export function ProductPrintPicker({ product }: { product: Product }) {
  const config = product.printConfig;
  const variants = product.variants.filter((variant) => variant.printPricing);
  const [variantSlug, setVariantSlug] = useState(variants[0]?.slug ?? "");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [finishingIds, setFinishingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
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
  const toggleFinishing = (id: string) => setFinishingIds((current) =>
    current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
  );
  const submit = () => {
    if (!variant || price === null) {
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
    }, price));
    router.push("/keranjang");
  };

  return (
    <div className="grid max-w-xl gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <label className="grid gap-2 text-sm font-medium text-secondary">Bahan / jenis cetak
        <select className={field} value={variantSlug} onChange={(event) => setVariantSlug(event.target.value)}>
          {variants.map((item) => <option key={item.slug} value={item.slug}>{item.name} — {item.printPricing?.method === "area" ? `${formatPrice(item.printPricing.ratePerM2)} / m²` : "Per lembar"}</option>)}
        </select>
      </label>
      {pricing?.method === "area" && <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-sm font-medium text-secondary">Lebar (m)
          <input className={field} type="number" inputMode="decimal" min={config.minWidthM} max={config.maxWidthM} step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-secondary">Tinggi (m)
          <input className={field} type="number" inputMode="decimal" min={config.minHeightM} max={config.maxHeightM} step="0.01" value={height} onChange={(event) => setHeight(event.target.value)} />
        </label>
      </div>}
      {pricing?.method === "sheet" && <p className="text-sm text-muted">{pricing.description || "Harga per lembar"}</p>}
      {config.finishingOptions.length > 0 && <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium text-secondary">Finishing</legend>
        {config.finishingOptions.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={finishingIds.includes(option.id)} onChange={() => toggleFinishing(option.id)} />{option.name}
        </label>)}
      </fieldset>}
      <p className="text-lg font-bold text-secondary">{price === null ? "Masukkan ukuran" : `${formatPrice(price)} / unit`}</p>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button type="button" onClick={submit} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark">Tambah ke keranjang</button>
    </div>
  );
}
