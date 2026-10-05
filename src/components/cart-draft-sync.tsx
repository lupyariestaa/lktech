"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { getIdToken } from "@/lib/auth";

/**
 * Sinkronisasi DRAFT KERANJANG ke server (FASE P5).
 *
 * Best-effort: saat keranjang user login berubah (debounce), simpan draft ke
 * `POST /api/cart/draft`. Bila keranjang kosong → hapus draft. Kegagalan tidak
 * mengganggu UX. Draft dipakai cron pengiriman email pengingat H+1.
 *
 * Tidak merender apa pun (`null`).
 */
export function CartDraftSync() {
  const { items, ready } = useCart();
  const { user, loading } = useAuth();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string>("");

  useEffect(() => {
    if (loading || !ready || !user) return;

    // Tanda tangan ringkas isi keranjang (hindari kirim berulang sama).
    const signature = JSON.stringify(
      items.map((it) => [it.slug, it.variantSlug ?? "", it.qty, it.price]),
    );
    if (signature === lastSent.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        lastSent.current = signature;

        if (items.length === 0) {
          await fetch("/api/cart/draft", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          return;
        }
        const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
        await fetch("/api/cart/draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subtotal,
            items: items.map((it) => ({
              slug: it.slug,
              name: it.name,
              price: it.price,
              qty: it.qty,
              variantSlug: it.variantSlug,
            })),
          }),
        });
      } catch {
        /* best-effort */
      }
    }, 1500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, ready, user, loading]);

  return null;
}
