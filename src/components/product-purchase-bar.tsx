"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ShieldCheck, X } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { productPriceLabel } from "@/lib/product-format";
import { useProductPurchase } from "@/components/product-purchase-context";
import {
  SelectedVariantActions,
  VariantPickerList,
} from "@/components/product-purchase-panel";
import { cn } from "@/lib/utils";

/**
 * Bar pembelian STICKY di bawah layar (MOBILE/tablet kecil < lg).
 *
 * Menampilkan harga ringkas + tombol "Pilih Paket" / "Beli". Klik → membuka
 * bottom sheet berisi daftar paket + aksi beli. Tombol CTA di dalam sheet
 * aktif setelah paket dipilih (via context).
 */
export function ProductPurchaseBar({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const { selectedVariantSlug } = useProductPurchase();

  return (
    <div className="lg:hidden">
      {/* Sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-[9000] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.15)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted">
              {selectedVariantSlug ? "Terpilih" : "Mulai dari"}
            </p>
            <p className="truncate text-base font-bold text-secondary">
              {productPriceLabel(product)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <ChevronUp className="h-4 w-4" />
            {selectedVariantSlug ? "Beli" : "Pilih Paket"}
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      <ProductPurchaseSheet
        product={product}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/** Bottom sheet pilih paket (mobile). */
function ProductPurchaseSheet({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const { selectedVariantSlug } = useProductPurchase();

  // Kunci scroll body + Escape saat sheet terbuka.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih paket"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        {/* Handle + header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-secondary">Pilih paket</p>
            <p className="text-xs text-muted">
              {product.variants.length} paket tersedia
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-surface"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <VariantPickerList product={product} />
        </div>

        {/* Aksi sticky di bawah sheet */}
        <div className="border-t border-slate-100 px-5 py-4">
          <SelectedVariantActions
            product={product}
            className={cn(selectedVariantSlug ? "" : "opacity-100")}
          />
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            Login akun Google diperlukan. Checkout via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
