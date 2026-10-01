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
  /**
   * True bila pemuatan awal GAGAL. Selama true, `content` masih berisi
   * `defaultSiteContent()` (data contoh) sehingga MENYIMPAN apa pun akan
   * menimpa seluruh dokumen konten produksi dengan default → data-loss.
   * Karena itu `commit` diblokir selama `loadFailed` true.
   */
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSiteContent();
      setContent(data);
      setError(null);
      setLoadFailed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat konten.");
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch awal saat mount. `setLoading(false)` / `setContent` hanya dipanggil
  // setelah `await`, jadi tidak memicu cascading render sinkron. `loading` sudah
  // bernilai `true` sebagai state awal, jadi tidak perlu di-set lagi di sini.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSiteContent();
        if (!active) return;
        setContent(data);
        setError(null);
        setLoadFailed(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat konten.");
        setLoadFailed(true);
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
      // Cegah data-loss: bila pemuatan awal gagal, `content` masih default.
      // Menyimpan sekarang akan menimpa seluruh konten produksi. Tolak & minta
      // muat ulang dulu.
      if (loadFailed) {
        const msg =
          "Konten belum berhasil dimuat. Muat ulang halaman sebelum menyimpan agar tidak menimpa data yang ada.";
        setError(msg);
        toast.error(msg);
        return false;
      }
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
    [content, toast, loadFailed],
  );

  /**
   * Melaporkan error validasi: set banner inline + tampilkan toast, agar
   * umpan balik konsisten di semua manager konten.
   */
  const reject = useCallback(
    (message: string | null) => {
      setError(message);
      if (message) toast.error(message);
    },
    [toast],
  );

  return {
    content,
    loading,
    saving,
    error,
    loadFailed,
    setError,
    reject,
    reload: load,
    commit,
  };
}
