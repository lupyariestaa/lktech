"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccountStatus } from "@/components/account-status-provider";
import { CartCoupon, type AppliedCoupon } from "@/components/cart-coupon";
import { createOrderRequest } from "@/lib/order-api";
import { cartItemKey } from "@/lib/cart";
import { formatPrice } from "@/lib/product-format";
import { formatRupiah } from "@/lib/format";
import { trackCheckout, trackEvent } from "@/lib/analytics";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function CartView() {
  const { items, subtotal, ready, setQty, remove, clear } = useCart();
  const { user } = useAuth();
  const { blocked } = useAccountStatus();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Diskon bila kupon diterapkan (server memverifikasi ulang saat checkout).
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const [done, setDone] = useState(false);

  const onCheckout = async () => {
    setError(null);
    if (items.length === 0 || sending) return;
    if (blocked) {
      setError(
        "Akun Anda sedang diblokir, sehingga tidak dapat melakukan checkout. Hubungi kami via WhatsApp untuk bantuan.",
      );
      return;
    }

    // Wajib login sebelum checkout.
    if (!user) {
      router.push("/masuk?next=%2Fkeranjang");
      return;
    }

    setSending(true);
    try {
      // Server memverifikasi harga/stok, memvalidasi kupon, & menyusun pesan.
      const { order } = await createOrderRequest(
        items.map((it) => ({
          slug: it.slug,
          variantSlug: it.variantSlug,
          qty: it.qty,
        })),
        user.displayName ?? "",
        appliedCoupon?.code,
      );

      // Buka WhatsApp dengan pesan kanonik dari server.
      const url = waLink(order.message, order.whatsapp);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        // Popup diblokir → arahkan di tab yang sama.
        window.location.href = url;
      }

      trackCheckout({
        items: items.reduce((n, it) => n + it.qty, 0),
        total: order.total,
      });
      if (appliedCoupon) {
        trackEvent("coupon_applied", { code: appliedCoupon.code });
      }

      clear();
      setAppliedCoupon(null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan.");
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-32 text-center text-sm text-muted">
        Memuat keranjang…
      </div>
    );
  }

  if (done && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-28 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-secondary">
          Pesanan dikirim
        </h1>
        <p className="mt-2 text-sm text-muted">
          Pesanan Anda sudah diteruskan ke WhatsApp kami. Lanjutkan percakapan di
          WhatsApp untuk menyelesaikan pembayaran. Rincian pesanan juga kami
          kirimkan ke email Anda.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/produk"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <Package className="h-4 w-4" />
            Belanja lagi
          </Link>
          <Link
            href="/akun"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            Lihat pesanan saya
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-28 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary">
          <ShoppingBag className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-secondary">
          Keranjang masih kosong
        </h1>
        <p className="mt-2 text-sm text-muted">
          Jelajahi produk kami dan tambahkan yang Anda butuhkan.
        </p>
        <Link
          href="/produk"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          <Package className="h-4 w-4" />
          Lihat Produk
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-28">
      <h1 className="text-2xl font-bold text-secondary sm:text-3xl">
        Keranjang <span className="text-gradient">Belanja</span>
      </h1>
      <p className="mt-2 text-sm text-muted">
        Tinjau produk lalu lanjutkan checkout via WhatsApp.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Daftar item */}
        <ul className="flex flex-col gap-4">
          {items.map((it) => (
            <li
              key={cartItemKey(it)}
              className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <Link
                  href={`/produk/${it.slug}`}
                  className="text-sm font-bold text-secondary hover:text-primary"
                >
                  {it.name}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {formatPrice(it.price)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-full border border-slate-200">
                  <button
                    onClick={() => setQty(cartItemKey(it), it.qty - 1)}
                    className="grid h-9 w-9 place-items-center rounded-l-full text-slate-500 transition-colors hover:text-primary"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-secondary tabular-nums">
                    {it.qty}
                  </span>
                  <button
                    onClick={() => setQty(cartItemKey(it), it.qty + 1)}
                    className="grid h-9 w-9 place-items-center rounded-r-full text-slate-500 transition-colors hover:text-primary"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span className="w-24 text-right text-sm font-bold text-secondary">
                  {formatPrice(it.price * it.qty)}
                </span>

                <button
                  onClick={() => remove(cartItemKey(it))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Hapus item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}

          <li className="flex justify-end">
            <button
              onClick={clear}
              className="text-xs font-semibold text-muted hover:text-rose-500"
            >
              Kosongkan keranjang
            </button>
          </li>
        </ul>

        {/* Ringkasan & checkout */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-bold text-secondary">Ringkasan</h2>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-bold text-secondary">
                {formatPrice(subtotal)}
              </span>
            </div>

            {discount > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-emerald-600">
                  Diskon
                  {appliedCoupon ? ` (${appliedCoupon.code})` : ""}
                </span>
                <span className="font-bold text-emerald-600">
                  −{formatRupiah(discount)}
                </span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
              <span className="text-sm font-semibold text-secondary">Total</span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(total)}
              </span>
            </div>

            {/* Kode promo */}
            <div className="mt-5">
              <CartCoupon
                subtotal={subtotal}
                applied={appliedCoupon}
                onApplied={setAppliedCoupon}
                onCleared={() => setAppliedCoupon(null)}
                disabled={Boolean(user) && blocked}
              />
            </div>

            <div className="my-5 h-px bg-slate-100" />

            {user ? (
              blocked ? (
                <div className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Akun Anda sedang diblokir, sehingga tidak dapat melakukan
                  checkout. Hubungi kami via WhatsApp untuk bantuan.
                </div>
              ) : (
                <div className="rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
                  Checkout sebagai{" "}
                  <span className="font-semibold text-secondary">
                    {user.displayName || user.email}
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Anda perlu masuk dengan Google sebelum checkout agar data
                pemesan otomatis terisi.
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-600">
                {error}
              </p>
            )}

            <button
              onClick={onCheckout}
              disabled={sending || (Boolean(user) && blocked)}
              className={cn(
                "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              {sending ? (
                <>
                  Memproses
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  {user ? "Checkout via WhatsApp" : "Masuk untuk Checkout"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              Pesanan diteruskan ke WhatsApp dengan detail produk &amp; data
              akun Anda.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
