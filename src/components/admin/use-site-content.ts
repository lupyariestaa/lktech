"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSiteContent, saveSiteContent } from "@/lib/admin-content-api";
import { defaultSiteContent, type SiteContent } from "@/lib/content-types";
import { useToast } from "@/components/admin/toast";

/**
 * Hook bersama untuk halaman konten dashboard (Hero, Layanan, FAQ, Harga).
 * Memuat seluruh konten, lalu memungkinkan update salah satu bagian dan
 * menyimpan kembali dokumen konten secara utuh.
 *
 * Setiap simpan yang berhasil/gagal otomatis memunculkan notifikasi (toast).
 */
export function useSiteContent() {
  const toast = useToast();
  const [content, setContent] = useState<SiteContent>(() => defaultSiteContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSiteContent();
      setContent(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat konten.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSiteContent();
        if (!active) return;
        setContent(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat konten.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /**
   * Terapkan perubahan pada sebagian `SiteContent`, simpan, lalu sinkronkan
   * state dengan hasil dari server (yang sudah dinormalkan).
   */
  const commit = useCallback(
    async (
      patch: Partial<SiteContent>,
      opts?: { rollback?: SiteContent; successMessage?: string },
    ) => {
      const previous = opts?.rollback ?? content;
      const next: SiteContent = { ...content, ...patch };
      setContent(next);
      setSaving(true);
      setError(null);
      try {
        const saved = await saveSiteContent(next);
        setContent(saved);
        toast.success(opts?.successMessage ?? "Perubahan berhasil disimpan.");
        return true;
      } catch (err) {
        setContent(previous); // rollback
        const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
        setError(msg);
        toast.error(msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [content, toast],
  );

  return { content, loading, saving, error, setError, reload: load, commit };
}
