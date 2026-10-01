"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

export type ServiceOption = { slug: string; title: string };

/**
 * Hook ringan untuk mengambil daftar layanan (slug + judul) saja.
 *
 * Memakai endpoint khusus `/api/admin/services` yang hanya mengembalikan daftar
 * ringkas — TIDAK memuat seluruh `SiteContent` (menghindari over-fetch).
 * Fetch dilakukan sekali saat mount; `setState` hanya setelah `await`.
 */
export function useServices() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await adminFetch<{ services: ServiceOption[] }>(
          "/api/admin/services",
        );
        if (!active) return;
        setServices(data.services);
      } catch {
        /* biarkan kosong; field layanan bersifat opsional */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { services, loading };
}
