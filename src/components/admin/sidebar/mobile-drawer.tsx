"use client";

import type { User } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useDrawerFocus } from "@/components/admin/use-drawer-focus";
import { SidebarContent } from "./sidebar-content";
import { useEscape } from "./use-escape";
import type { SidebarBadges } from "./sidebar-item";

/**
 * Drawer menu mobile (< lg).
 *
 * Aksesibilitas (SB-01/SB-02/SB-05):
 * - Conditional render → drawer tertutup tidak pernah ada di DOM (tidak tabbable).
 * - `role="dialog"` + `aria-modal="true"` + `aria-label` → screen reader
 *   mengumumkan konteks menu terbuka.
 * - Fokus dipindah ke tombol tutup saat buka; Tab ter-trap; fokus kembali ke
 *   hamburger saat tutup (via `useDrawerFocus`).
 * - Escape menutup (listener hidup/mati bersama drawer).
 */
export function MobileDrawer({
  open,
  onClose,
  pathname,
  badges,
  user,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  badges?: SidebarBadges;
  user: User | null;
  onNavigate: (href: string) => void;
  onLogout: () => Promise<void>;
}) {
  const { ref } = useDrawerFocus<HTMLDivElement>(open);
  useEscape(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-30 bg-secondary/30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Panel drawer */}
          <motion.div
            key="panel"
            ref={ref}
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu dashboard"
            className="fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
          >
            <SidebarContent
              pathname={pathname}
              badges={badges}
              user={user}
              onNavigate={onNavigate}
              onClose={onClose}
              onLogout={onLogout}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

