"use client";

import { useEffect, useState } from "react";
import { fetchSiteContent } from "@/lib/admin-content-api";

export type ServiceOption = { slug: string; title: string };

/**
 * Hook ringan untuk mengambil daftar layanan (slug + judul) saja.
 *
 * Dipakai mis. oleh `projects-manager` yang hanya butuh daftar layanan untuk
 * pilihan, tanpa perlu memuat & mengelola seluruh `SiteContent` (menghindari
 * over-fetch state). Fetch dilakukan sekali saat mount; `setState` hanya
 * setelah `await` sehingga tidak memicu cascading render sinkron.
 */
export function useServices() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const content = await fetchSiteContent();
        if (!active) return;
        setServices(
          content.services.map((s) => ({ slug: s.slug, title: s.title })),
        );
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
