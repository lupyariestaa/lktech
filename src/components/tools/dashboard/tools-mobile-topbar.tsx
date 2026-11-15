import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";

/**
 * Topbar mobile (di bawah `lg`): hamburger, brand, dan tautan akun.
 * Topbar ini menggantikan Navbar marketing di dalam dashboard.
 */
export function ToolsMobileTopbar({
  drawerOpen,
  onOpenDrawer,
}: {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-sm sm:px-4 lg:hidden">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Buka menu tools"
        aria-expanded={drawerOpen}
        aria-controls={drawerOpen ? "tools-drawer" : undefined}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-secondary transition-colors hover:border-primary/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <Link
        href="/tools/ruang"
        className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        aria-label="LKTech Tools — ruang tools"
      >
        <Logo href={null} variant="mark" height={26} />
        <span className="truncate text-sm font-bold text-secondary">
          LKTech <span className="text-primary">Tools</span>
        </span>
      </Link>

      <Link
        href="/akun"
        aria-label="Buka akun saya"
        className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-secondary transition-colors hover:border-primary/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
      </Link>
    </header>
  );
}
