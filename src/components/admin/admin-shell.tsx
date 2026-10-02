"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useUnsavedNavigation } from "@/components/admin/unsaved-changes";
import { signOutUser } from "@/lib/auth";
import { clearAdminSession } from "@/lib/admin-fetch";
import { matchAdminItem } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";
import { MobileDrawer } from "@/components/admin/sidebar/mobile-drawer";
import { SidebarContent } from "@/components/admin/sidebar/sidebar-content";
import { useSidebarState } from "@/components/admin/use-sidebar-state";
import { useAdminBadges } from "@/components/admin/use-admin-badges";
import { CommandPalette } from "@/components/admin/command-palette";

/**
 * Shell dashboard admin: sidebar (desktop rail/expanded + drawer mobile),
 * header (toggle rail + judul konteks + tombol palette), dan main content.
 *
 * Navigasi menu melewati guard "perubahan belum disimpan" via
 * `useUnsavedNavigation`; modifier-click (Ctrl/Cmd/Shift/Alt) dibiarkan
 * native (buka tab baru) â€” ditangani di `SidebarItem`.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useUnsavedNavigation();

  const [open, setOpen] = useState(false); // drawer mobile
  const { collapsed, toggle: toggleRail } = useSidebarState();
  const { newLeads, newOrders } = useAdminBadges();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Tutup drawer otomatis saat route berubah (mobile). Dibandingkan saat render
  // (bukan di effect) agar tidak memicu cascading render â€” pola yang disarankan
  // React untuk menyesuaikan state berdasarkan perubahan nilai sebelumnya.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Tutup drawer bila viewport melebar ke desktop (â‰¥ lg). Tanpa ini, `open`
  // bisa "nyangkut" true padahal drawer `display:none` â†’ konten tetap `inert`.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Shortcut global: Ctrl/Cmd+K (palette) & "[" (toggle rail, desktop only).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "[") {
        // Jangan intercept saat sedang mengetik di kolom input.
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.tagName === "SELECT" ||
            t.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleRail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleRail]);

  const onLogout = useCallback(async () => {
    await clearAdminSession();
    await signOutUser();
    router.replace("/admin/login");
  }, [router]);

  /**
   * Navigasi internal: tutup drawer lalu lewat guard unsaved.
   * Klik ke halaman yang sedang aktif tidak memicu guard (tidak ada
   * perpindahan konteks â€” hanya menutup drawer).
   */
  const onNavigate = useCallback(
    (href: string) => {
      setOpen(false);
      if (matchAdminItem(pathname)?.href !== href) {
        navigate(href);
      }
    },
    [navigate, pathname],
  );

  const title = matchAdminItem(pathname)?.title ?? "Dashboard";

  const closeDrawer = useCallback(() => setOpen(false), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex w-full">
        {/* Sidebar desktop (â‰¥ lg) â€” expanded â†” rail */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out lg:flex",
            collapsed ? "w-20" : "w-64",
          )}
        >
          <SidebarContent
            variant={collapsed ? "rail" : "expanded"}
            pathname={pathname}
            badges={{ newLeads, newOrders }}
            user={user}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        </aside>

        {/* Drawer mobile (< lg) â€” conditional render + dialog semantics */}
        <MobileDrawer
          open={open}
          onClose={closeDrawer}
          pathname={pathname}
          badges={{ newLeads, newOrders }}
          user={user}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        {/* Main â€” `inert` saat drawer mobile terbuka agar Tab tidak "lolos"
            ke konten di belakang dialog (mendukung aria-modal secara nyata). */}
        <div
          className="flex min-h-screen w-full min-w-0 flex-col"
          inert={open ? true : undefined}
        >
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Hamburger (mobile) */}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-secondary transition-colors hover:border-primary/30 hover:text-primary lg:hidden"
                aria-label="Buka menu"
                aria-expanded={open}
                aria-controls="admin-mobile-drawer"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Toggle rail (desktop) */}
              <button
                type="button"
                onClick={toggleRail}
                className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface hover:text-primary lg:grid"
                aria-label={collapsed ? "Perlebar sidebar" : "Ciutkan sidebar"}
                aria-pressed={collapsed}
                title={`${collapsed ? "Perlebar" : "Ciutkan"} sidebar â€” shortcut [`}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </button>

              {/* Judul konteks â€” bukan heading (h1 ada di tiap halaman) */}
              <p className="min-w-0 truncate text-sm font-semibold text-secondary">
                {title}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm text-muted transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="Cari menu (Ctrl+K)"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Cari menuâ€¦</span>
                <kbd className="ml-1 hidden rounded-md border border-slate-200 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 lg:inline">
                  Ctrl K
                </kbd>
              </button>
            </div>
          </header>

          <main id="konten" tabIndex={-1} className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    </div>
  );
}

