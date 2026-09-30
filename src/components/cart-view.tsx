"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { useSettings } from "@/components/settings-provider";
import { buildCheckoutMessage } from "@/lib/cart";
import { formatPrice } from "@/lib/product-format";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function CartView() {
  const { items, subtotal, ready, setQty, remove, clear } = useCart();
  const { user } = useAuth();
  const settings = useSettings();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const onCheckout = () => {
    setError(null);
    if (items.length === 0) return;

    // Wajib login sebelum checkout.
    if (!user) {
      router.push("/masuk?next=%2Fkeranjang");
      return;
    }

    const message = buildCheckoutMessage(items, {
      name: user.displayName ?? "",
      email: user.email ?? "",
    });
    const url = waLink(message, settings.whatsapp);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-32 text-center text-sm text-muted">
        Memuat keranjang…
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
              key={it.slug}
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
                    onClick={() => setQty(it.slug, it.qty - 1)}
                    className="grid h-9 w-9 place-items-center rounded-l-full text-slate-500 transition-colors hover:text-primary"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-secondary tabular-nums">
                    {it.qty}
                  </span>
                  <button
                    onClick={() => setQty(it.slug, it.qty + 1)}
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
                  onClick={() => remove(it.slug)}
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

            <div className="my-5 h-px bg-slate-100" />

            {user ? (
              <div className="rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
                Checkout sebagai{" "}
                <span className="font-semibold text-secondary">
                  {user.displayName || user.email}
                </span>
              </div>
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
              className={cn(
                "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark",
              )}
            >
              {user ? "Checkout via WhatsApp" : "Masuk untuk Checkout"}
              <ArrowRight className="h-4 w-4" />
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
