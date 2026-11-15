"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ToolsMobileDrawer } from "@/components/tools/dashboard/tools-mobile-drawer";
import { ToolsMobileTopbar } from "@/components/tools/dashboard/tools-mobile-topbar";
import { ToolsSidebarContent } from "@/components/tools/dashboard/tools-sidebar-content";
import {
  useToolFavorites,
  useToolsStorageAvailable,
  useToolUsage,
} from "@/components/tools/use-tools-preferences";
import {
  TOOLS,
  getToolBySlug,
} from "@/lib/tools-registry-pure";
import { trackToolsToolOpenIntent } from "@/lib/analytics";
import { getActiveToolSlug } from "@/lib/tools-usage-pure";

/**
 * Shell dashboard LKTech Tools.
 *
 * Desktop: sidebar 264–280 px yang sticky + area utama. Mobile: topbar sticky +
 * drawer. Navbar/Footer marketing sengaja tidak dipakai di sini; identitas
 * situs tetap tersedia lewat brand dan "Kembali ke situs" di sidebar.
 *
 * `children` tetap server component (halaman ruang/workspace); shell hanya
 * mengelola navigasi, drawer, dan preferensi lokal.
 */
export function ToolsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const favorites = useToolFavorites();
  const usage = useToolUsage();
  const storageAvailable = useToolsStorageAvailable();

  const activeSlug = getActiveToolSlug(pathname, TOOLS);
  const activeTool = activeSlug ? getToolBySlug(activeSlug, TOOLS) : null;

  const trackSidebarOpen = (slug: string) => {
    trackToolsToolOpenIntent({ tool: slug, source: "sidebar" });
  };

  // Drawer tidak boleh tertinggal terbuka saat viewport melebar ke desktop.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (query.matches) setDrawerOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[264px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
      <a
        href="#tools-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Lewati ke konten
      </a>

      <aside
        aria-label="Sidebar LKTech Tools"
        className="sticky top-0 hidden h-dvh border-r border-slate-200 bg-white lg:block"
      >
        <ToolsSidebarContent
          pathname={pathname}
          activeTool={activeTool}
          favorites={favorites}
          usage={usage}
          onToolOpen={trackSidebarOpen}
        />
      </aside>

      <div
        className="flex min-w-0 flex-col"
        inert={drawerOpen ? true : undefined}
      >
        <ToolsMobileTopbar
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <main
          id="tools-main"
          tabIndex={-1}
          className="min-w-0 flex-1 focus:outline-none"
        >
          {!storageAvailable && (
            <p
              role="status"
              className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 sm:px-6 lg:px-10"
            >
              Penyimpanan browser tidak tersedia. Favorit dan riwayat tetap
              berfungsi di tab ini, tetapi tidak akan tersimpan setelah tab
              ditutup.
            </p>
          )}
          {children}
        </main>
      </div>

      <ToolsMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathname={pathname}
        activeTool={activeTool}
        favorites={favorites}
        usage={usage}
        onToolOpen={trackSidebarOpen}
      />
    </div>
  );
}
