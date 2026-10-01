"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type UnsavedContextValue = {
  /** Tandai apakah ada perubahan belum disimpan pada form aktif. */
  setDirty: (dirty: boolean) => void;
  /** Coba navigasi ke `href`; bila ada perubahan, minta konfirmasi dulu. */
  requestNavigation: (href: string) => void;
  /** True bila ada perubahan belum disimpan. */
  dirty: boolean;
};

const UnsavedContext = createContext<UnsavedContextValue | null>(null);

/**
 * Provider proteksi perubahan belum disimpan untuk area dashboard.
 *
 * Manager menandai status dirty lewat `useRegisterDirty`. Provider menangani
 * peringatan `beforeunload` serta konfirmasi saat user mencoba pindah menu
 * (dilakukan oleh `AdminShell` lewat `requestNavigation`).
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [dirty, setDirtyState] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const setDirty = useCallback((value: boolean) => {
    setDirtyState(value);
  }, []);

  // Peringatan bawaan browser saat menutup/refresh tab.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const requestNavigation = useCallback(
    (href: string) => {
      if (dirty) {
        setPendingHref(href);
      } else {
        router.push(href);
      }
    },
    [dirty, router],
  );

  const value = useMemo<UnsavedContextValue>(
    () => ({ setDirty, requestNavigation, dirty }),
    [setDirty, requestNavigation, dirty],
  );

  return (
    <UnsavedContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={pendingHref !== null}
        title="Perubahan belum disimpan"
        description="Ada perubahan yang belum disimpan. Yakin ingin pindah halaman dan membuang perubahan tersebut?"
        confirmLabel="Buang & pindah"
        cancelLabel="Tetap di sini"
        tone="danger"
        onConfirm={() => {
          const href = pendingHref;
          setDirtyState(false);
          setPendingHref(null);
          if (href) router.push(href);
        }}
        onCancel={() => setPendingHref(null)}
      />
    </UnsavedContext.Provider>
  );
}

/** Dipakai oleh AdminShell untuk mengintersep navigasi sidebar. */
export function useUnsavedNavigation() {
  const ctx = useContext(UnsavedContext);
  return ctx?.requestNavigation ?? ((href: string) => void href);
}

const noop = () => {};

/**
 * Dipakai oleh manager/form untuk menandai status dirty.
 * Aman dipanggil walau tanpa provider (fallback no-op).
 */
export function useRegisterDirty(isDirty: boolean) {
  const ctx = useContext(UnsavedContext);
  // Referensi stabil agar cleanup tidak salah mereset dirty terbaru dan
  // menghindari perubahan deps setiap render.
  const setDirty = ctx?.setDirty ?? noop;
  const prev = useRef(false);

  useEffect(() => {
    if (isDirty !== prev.current) {
      prev.current = isDirty;
      setDirty(isDirty);
    }
  }, [isDirty, setDirty]);

  // Reset saat manager unmount (mis. pindah halaman tanpa guard).
  useEffect(() => {
    return () => {
      setDirty(false);
    };
  }, [setDirty]);
}
