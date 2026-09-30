"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook generik untuk resource daftar di dashboard admin.
 *
 * Menyediakan `data`, `loading`, `error`, `setData`, dan `reload`.
 * Fetch awal dijalankan sekali saat mount; setiap `setState` hanya dipanggil
 * setelah `await` (di dalam callback async), sehingga tidak memicu cascading
 * render sinkron (aturan React 19 `set-state-in-effect`).
 *
 * Catatan: `loader` harus berupa fungsi stabil (mis. `fetchLeads` dari modul).
 * Nilai terbarunya disimpan lewat ref yang di-set DI DALAM effect, bukan saat
 * render, agar aman dari aturan "jangan akses ref saat render".
 */
export function useAsyncList<T>(
  loader: () => Promise<T[]>,
  errorMessage = "Gagal memuat data.",
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const items = await loader();
        setData(items);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [loader, errorMessage],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await loader();
        if (!active) return;
        setData(items);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : errorMessage);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loader, errorMessage]);

  return { data, setData, loading, error, setError, reload };
}
