"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Proteksi "perubahan belum disimpan".
 *
 * - Saat `dirty` true, menambah `beforeunload` (peringatan saat menutup/refresh tab).
 * - Menyediakan `guard(action)`: bungkus aksi navigasi/aksi berbahaya; bila dirty,
 *   dialog konfirmasi ditampilkan dan aksi dijalankan hanya bila user setuju.
 *
 * Pemakaian:
 *   const { dirty, guard, dialogProps } = useUnsavedChanges(formDirty);
 *   <button onClick={() => guard(() => setEditing(null))}>Batal</button>
 *   <ConfirmDialog {...dialogProps} />
 */
export function useUnsavedChanges(isDirty: boolean) {
  const [pending, setPending] = useState<null | (() => void)>(null);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const guard = useCallback(
    (action: () => void) => {
      if (isDirty) {
        setPending(() => action);
      } else {
        action();
      }
    },
    [isDirty],
  );

  const dialogProps = {
    open: pending !== null,
    title: "Perubahan belum disimpan",
    description:
      "Ada perubahan yang belum disimpan. Yakin ingin keluar dan membuang perubahan tersebut?",
    confirmLabel: "Buang & keluar",
    cancelLabel: "Tetap di sini",
    tone: "danger" as const,
    onConfirm: () => {
      const action = pending;
      setPending(null);
      action?.();
    },
    onCancel: () => setPending(null),
  };

  return { dirty: isDirty, guard, dialogProps };
}
