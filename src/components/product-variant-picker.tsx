"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/product-types";
import { cardItemForVariant } from "@/lib/cart";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccountStatus } from "@/components/account-status-provider";
import { VariantCanvas } from "@/components/variant-canvas";
import { VariantCard } from "@/components/variant-card";
import { waLink } from "@/lib/whatsapp";

/**
 * Pemilih paket/varian (produk multi-harga), super responsif.
 *
 * - MOBILE (< lg): daftar VERTIKAL (stack) — mudah di-scroll, tanpa kanvas.
 * - TABLET & DESKTOP (≥ lg): KANVAS pan + zoom (kartu lebar tetap).
 *
 * Aksi "Beli Sekarang"/"Keranjang" tetap ada; state pilihan dibagi ke panel
 * sidebar/bottom-bar lewat context.
 */
export function ProductVariantPicker({
  product,
  variants,
}: {
  product: Product;
  variants: ProductVariant[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { blocked } = useAccountStatus();
  const { add } = useCart();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const requireLogin = (): boolean => {
    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(`/produk/${product.slug}`)}`);
      return false;
    }
    return true;
  };

  const pick = (variant: ProductVariant, buyNow: boolean) => {
    if (variant.soldOut || blocked || busySlug) return;
    if (!requireLogin()) return;
    setBusySlug(variant.slug);
    add(cardItemForVariant(product, variant, 1));
    if (buyNow) {
      router.push("/keranjang");
      return;
    }
    setAddedId(variant.slug);
    setBusySlug(null);
    setTimeout(() => setAddedId(null), 1800);
  };

  const cards = variants.map((v) => (
    <VariantCard
      key={v.slug}
      variant={v}
      layout="canvas"
      busy={busySlug === v.slug}
      added={addedId === v.slug}
      onBuy={(x) => pick(x, true)}
      onAddCart={(x) => pick(x, false)}
    />
  ));

  return (
    <div>
      {/* Mobile/tablet kecil: daftar vertikal */}
      <div className="flex flex-col gap-5 lg:hidden">
        {variants.map((v) => (
          <VariantCard
            key={v.slug}
            variant={v}
            layout="stack"
            busy={busySlug === v.slug}
            added={addedId === v.slug}
            onBuy={(x) => pick(x, true)}
            onAddCart={(x) => pick(x, false)}
          />
        ))}
      </div>

      {/* Desktop: kanvas pan + zoom */}
      <div className="hidden lg:block">
        <VariantCanvas>
          <div className="flex gap-6">{cards}</div>
        </VariantCanvas>
      </div>

      {/* Ajakan konsultasi */}
      <div className="mt-8 lg:mt-10">
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-secondary">
                Butuh paket lain atau kombinasi khusus?
              </p>
              <p className="text-xs text-muted">
                Hubungi kami untuk konsultasi kebutuhan Anda.
              </p>
            </div>
          </div>
          <a
            href={waLink(
              product.waMessage?.trim() ||
                `Halo LKTech! Saya ingin bertanya tentang produk "${product.name}".`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" />
            Tanya via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
