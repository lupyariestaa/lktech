"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ToolsCta } from "@/components/tools/tools-cta";

const DISMISS_KEY = "lktech.tools.sticky-cta.dismissed.v1";

/**
 * CTA lengket di mobile. Muncul setelah pengguna melewati hero, disembunyikan
 * saat mendekati footer, dan bisa ditutup. Pilihan tutup disimpan di
 * sessionStorage (bukan localStorage) agar tidak mengganggu selamanya.
 */
export function ToolsStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* sessionStorage tidak tersedia — tetap tampilkan */
    }

    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom =
        window.innerHeight + y >=
        document.documentElement.scrollHeight - 420;
      setVisible(y > 680 && !nearBottom);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* abaikan */
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-secondary">
            Berkas beres, tanpa unggah.
          </p>
          <p className="truncate text-[11px] text-muted">
            5 tool · lokal di browser
          </p>
        </div>
        <ToolsCta
          location="sticky-mobile"
          target="/tools/ruang"
          size="sm"
          className="shrink-0"
          withLock={false}
        >
          Buka tools
        </ToolsCta>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup ajakan"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
