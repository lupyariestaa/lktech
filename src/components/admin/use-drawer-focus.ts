"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fokus & trap keyboard untuk drawer/dialog.
 *
 * - `open=true`: simpan elemen fokus sebelumnya → fokuskan elemen bertanda
 *   `data-autofocus`, fallback ke focusable pertama.
 * - Tab/Shift+Tab terjaga tetap di dalam drawer.
 * - Escape opsional menutup dialog (dipakai dialog admin; command palette
 *   punya handler sendiri).
 * - `open=false` / unmount: fokus dikembalikan ke elemen pemicu.
 *
 * Pola mengikuti `media-picker-dialog.tsx` (dipisah agar reusable).
 */
export function useDrawerFocus<T extends HTMLElement>(
  open: boolean,
  options?: { onEscape?: () => void },
): { ref: React.RefObject<T | null> } {
  const ref = useRef<T | null>(null);
  const escapeRef = useRef(options?.onEscape);

  useEffect(() => {
    escapeRef.current = options?.onEscape;
  }, [options?.onEscape]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = ref.current;
      if (!panel) return;
      const preferred = panel.querySelector<HTMLElement>("[data-autofocus]");
      if (preferred) {
        preferred.focus();
        return;
      }
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      focusables[0]?.focus();
    };
    // Fokus setelah paint agar elemen sudah ter-commit ke DOM.
    const focusTimer = window.setTimeout(focusFirst, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escapeRef.current) {
        e.preventDefault();
        escapeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = ref.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, ref]);

  return { ref };
}
