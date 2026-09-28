"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ExternalLink,
  Image as ImageIcon,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { signOutUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Ringkasan", href: "/admin", icon: LayoutDashboard },
  { label: "Lead", href: "/admin/leads", icon: Inbox },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Pengaturan", href: "/admin/settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await signOutUser();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-4 transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
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

          <nav className="mt-8 flex flex-col gap-1">
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

          <div className="absolute inset-x-4 bottom-4">
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
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur">
            <button
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-secondary lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="hidden text-sm font-semibold text-secondary lg:block">
              Dashboard
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

          <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
