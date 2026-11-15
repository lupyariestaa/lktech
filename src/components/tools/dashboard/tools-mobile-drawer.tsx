"use client";

import { useEffect } from "react";
import { useDrawerFocus } from "@/components/admin/use-drawer-focus";
import { ToolsSidebarContent } from "@/components/tools/dashboard/tools-sidebar-content";
import type { ToolDefinition } from "@/lib/tools-registry-pure";
import type { ToolUsageEntry } from "@/lib/tools-usage-pure";

/**
 * Drawer menu mobile (< lg).
 *
 * - Conditional render → drawer tertutup tidak ada di DOM (tidak tabbable).
 * - `role="dialog"` + `aria-modal` + label; fokus masuk ke tombol tutup,
 *   Tab ter-trap, Escape menutup, fokus kembali ke hamburger.
 * - Scroll body dikunci selama drawer terbuka.
 * - Isi memakai `ToolsSidebarContent` yang sama dengan sidebar desktop.
 */
export function ToolsMobileDrawer({
  open,
  onClose,
  pathname,
  activeTool,
  favorites,
  usage,
  onToolOpen,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  activeTool: ToolDefinition | null;
  favorites: readonly string[];
  usage: readonly ToolUsageEntry[];
  onToolOpen?: (slug: string) => void;
}) {
  const { ref } = useDrawerFocus<HTMLDivElement>(open, {
    onEscape: onClose,
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup menu tools"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-[1px]"
      />
      <div
        ref={ref}
        id="tools-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu tools"
        className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] max-w-full flex-col bg-white shadow-2xl"
      >
        <ToolsSidebarContent
          pathname={pathname}
          activeTool={activeTool}
          favorites={favorites}
          usage={usage}
          onNavigate={onClose}
          onToolOpen={onToolOpen}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
