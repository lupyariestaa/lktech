"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ExternalLink,
  FolderKanban,
  Newspaper,
  Image as ImageIcon,
  Settings,
  X,
  LayoutGrid,
  HelpCircle,
  Tags,
  PanelsTopLeft,
  Files,
  Package,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { signOutUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Ringkasan", href: "/admin", icon: LayoutDashboard },
  { label: "Lead", href: "/admin/leads", icon: Inbox },
  { label: "Hero", href: "/admin/hero", icon: PanelsTopLeft },
  { label: "Konten", href: "/admin/content", icon: Files },
  { label: "Layanan", href: "/admin/services", icon: LayoutGrid },
  { label: "Produk", href: "/admin/products", icon: Package },
  { label: "Harga", href: "/admin/pricing", icon: Tags },
  { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
  { label: "Portofolio", href: "/admin/projects", icon: FolderKanban },
  { label: "Blog", href: "/admin/blog", icon: Newspaper },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Pengaturan", href: "/admin/settings", icon: Settings },
];

/** Judul halaman berdasarkan pathname saat ini (header full-width). */
function titleForPath(pathname: string): string {
  const match = [...NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return match?.label ?? "Dashboard";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Tutup drawer otomatis saat route berubah (mobile). Dibandingkan saat render
  // (bukan di effect) agar tidak memicu cascading render — pola yang disarankan
  // React untuk menyesuaikan state berdasarkan perubahan nilai sebelumnya.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Tutup drawer dengan tombol Escape (aksesibilitas).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onLogout = async () => {
    await signOutUser();
    router.replace("/admin/login");
  };

  const title = titleForPath(pathname);

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex w-full">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between p-4">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-white">
                LK
              </span>
              <span className="text-sm font-bold text-secondary">
                Admin Panel
              </span>
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 lg:hidden"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-white shadow-sm shadow-primary/25"
                      : "text-slate-600 hover:bg-primary-50 hover:text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              Lihat Website
            </Link>
          </div>
        </aside>

        {/* Backdrop mobile */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-secondary/30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main */}
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-secondary lg:hidden"
                aria-label="Buka menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <h1 className="text-sm font-semibold text-secondary">{title}</h1>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-secondary">
                  {user?.displayName ?? "Admin"}
                </p>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
                {(user?.displayName ?? user?.email ?? "A").charAt(0).toUpperCase()}
              </span>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500"
              >
                <LogOut className="h-3.5 w-3.5" />
                Keluar
              </button>
            </div>
          </header>

          <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
