"use client";

import { SERVICES } from "@/lib/services";

export type ServiceOption = { slug: string; title: string };

/** Daftar layanan ringkas (slug + judul) dari modul hardcoded. */
const SERVICE_OPTIONS: ServiceOption[] = SERVICES.map((s) => ({
  slug: s.slug,
  title: s.title,
}));

/**
 * Hook ringan untuk mengambil daftar layanan (slug + judul) saja.
 *
 * Sejak sistem layanan menjadi HARDCODED (tidak dikelola dashboard), daftar
 * ini dibaca langsung dari modul `@/lib/services` — tanpa request API.
 */
export function useServices() {
  return { services: SERVICE_OPTIONS, loading: false };
}
