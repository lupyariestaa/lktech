"use client";

import { track } from "@vercel/analytics";

/**
 * Pelacakan event konversi terpusat (Vercel Web Analytics).
 *
 * Tujuan: mengukur aksi bernilai bisnis — klik WhatsApp, submit lead/order,
 * tambah ke keranjang, checkout — tanpa mengirim data pribadi pengguna.
 *
 * Prinsip:
 * - **Aman & tahan gagal**: pembungkus `trackEvent` tidak pernah melempar
 *   error (analytics tak boleh merusak UX). Bila diblokir/SSR → no-op.
 * - **Tanpa PII**: properti hanya berisi tipe/label/nilai non-sensitif
 *   (mis. nama layanan, jumlah, total) — TANPA nama/email/telepon/isi pesan.
 * - Nama event memakai gaya `snake_case` yang ringkas & konsisten.
 */

/** Properti yang diizinkan pada event (primitif — sesuai batas Vercel). */
type EventProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Kirim satu event analitik. Aman dipanggil di mana saja (client).
 * Tidak melakukan apa pun di server atau bila API gagal.
 */
export function trackEvent(name: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  try {
    track(name, props);
  } catch {
    /* analytics tidak boleh mengganggu aplikasi */
  }
}

/* -------------------------------------------------------------------------- */
/* Event terketik — satu tempat untuk nama & properti agar konsisten.          */
/* -------------------------------------------------------------------------- */

/**
 * Klik tautan/CTA WhatsApp (sumber konversi utama LKTech).
 * @param location Konteks tempat klik (mis. "navbar", "pricing", "layanan-detail").
 * @param label    Label opsional (mis. nama layanan/paket).
 */
export function trackWhatsAppClick(location: string, label?: string): void {
  trackEvent("whatsapp_click", { location, label: label ?? null });
}

/** Lead (form kontak) berhasil tersimpan. */
export function trackLeadSubmitted(service?: string): void {
  trackEvent("lead_submitted", { service: service ?? null });
}

/** Form kontak jatuh ke fallback WhatsApp (penyimpanan gagal). */
export function trackLeadFallback(service?: string): void {
  trackEvent("lead_fallback_whatsapp", { service: service ?? null });
}

/** Tambah produk ke keranjang. */
export function trackAddToCart(props: {
  slug: string;
  name?: string;
  qty: number;
  price?: number;
}): void {
  trackEvent("add_to_cart", {
    slug: props.slug,
    name: props.name ?? null,
    qty: props.qty,
    price: props.price ?? null,
  });
}

/** Checkout (kirim pesanan ke WhatsApp) berhasil. */
export function trackCheckout(props: { items: number; total: number }): void {
  trackEvent("checkout", { items: props.items, total: props.total });
}

/** Buka salah satu paket layanan (klik CTA paket). */
export function trackPackageClick(service: string, pkg: string): void {
  trackEvent("package_click", { service, package: pkg });
}
