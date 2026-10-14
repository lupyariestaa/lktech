"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Menu,
  X,
  MessageCircle,
  ShoppingCart,
  UserRound,
  LayoutDashboard,
} from "lucide-react";
import { buildNavMenu, isActiveHref, type NavItem } from "@/lib/nav";
import { SERVICES } from "@/lib/services";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { getIdToken } from "@/lib/auth";
import { ButtonAnchor } from "@/components/ui/button";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { Logo } from "@/components/logo";
import { useSettings } from "@/components/settings-provider";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { introDelay, useReducedMotionPreference } from "@/lib/intro";

/**
 * Item navbar desktop. Bila punya `children`, tampil sebagai dropdown saat
 * hover/fokus (via state, agar bisa diakses keyboard). Panel ditutup saat fokus
 * keluar dari item.
 */
function DesktopItem({
  item,
  pathname,
  open,
  onOpen,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const active =
    isActiveHref(pathname, item.href) ||
    (item.children?.some((c) => isActiveHref(pathname, c.href)) ?? false);

  const linkClass = cn(
    "group relative inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium transition-colors",
    active ? "text-primary" : "text-slate-600 hover:text-primary",
  );

  if (!item.children) {
    return (
      <li>
        <Link href={item.href} className={linkClass}>
          {item.label}
          <span
            className={cn(
              "absolute inset-x-3.5 bottom-1 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300",
              active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
            )}
          />
        </Link>
      </li>
    );
  }

  return (
    <li
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onFocus={onOpen}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
      }}
    >
      <Link
        href={item.href}
        className={linkClass}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "absolute inset-x-3.5 bottom-1 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300",
            active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
          )}
        />
      </Link>

      <div
        className={cn(
          "absolute top-full left-1/2 z-50 w-80 -translate-x-1/2 pt-2 transition-all duration-200",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <ul className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="flex flex-col rounded-xl px-3.5 py-2.5 transition-colors hover:bg-primary-50"
              >
                <span className="text-sm font-semibold text-secondary">
                  {child.label}
                </span>
                {child.description && (
                  <span className="mt-0.5 text-xs leading-snug text-muted">
                    {child.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const reduced = useReducedMotionPreference();
  const pathname = usePathname();
  const settings = useSettings();
  const { count, ready } = useCart();
  const { user } = useAuth();
  const isLanding = pathname === "/";
  const links = buildNavMenu(isLanding, SERVICES);
  // Intro loader hanya ada di landing; halaman dalam tampil langsung.
  const base = isLanding ? introDelay(reduced) : 0;

  // Apakah user yang login punya akses admin? Bila ya, ikon profil di navbar
  // diganti menjadi tautan ke dashboard admin (bukan profil user).
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token) {
          if (active) setIsAdmin(false);
          return;
        }
        const res = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (active) setIsAdmin(res.ok);
      } catch {
        if (active) setIsAdmin(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu ditutup lewat onClick tiap tautan (mobile akordeon + dropdown
  // desktop via onClose) — tanpa effect setState (hindari cascading render).

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-[100] transition-all duration-500",
        scrolled
          ? "border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm shadow-slate-900/5"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <motion.nav
        aria-label="Navigasi utama"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: base, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <Logo height={32} href="/" />

        <ul className="hidden items-center gap-0.5 lg:flex">
          {links.map((item, i) => (
            <DesktopItem
              key={item.label}
              item={item}
              pathname={pathname}
              open={openIdx === i}
              onOpen={() => setOpenIdx(i)}
              onClose={() => setOpenIdx((v) => (v === i ? null : v))}
            />
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/keranjang"
            className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            aria-label={`Keranjang belanja${count > 0 ? `, ${count} item` : ""}`}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {ready && count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {isAdmin ? (
            <Link
              href="/admin"
              className="hidden h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:grid"
              aria-label="Dashboard admin"
              title="Dashboard admin"
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href={user ? "/akun" : "/masuk"}
              className="hidden h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:grid"
              aria-label={user ? "Akun saya" : "Masuk akun"}
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}

          <ButtonAnchor
            href="/kontak"
            size="sm"
            variant="primary"
            className="hidden lg:inline-flex"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Konsultasi
          </ButtonAnchor>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-secondary transition-colors hover:border-primary/40 hover:text-primary lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu — akordeon untuk item bertingkat. */}
      <motion.div
        id="menu-mobile"
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"
      >
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <ul className="flex flex-col">
            {links.map((item, i) => {
              if (!item.children) {
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const expanded = openIdx === i;
              return (
                <li key={item.label}>
                  <button
                    onClick={() => setOpenIdx(expanded ? null : i)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary"
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        expanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-300",
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    {/* Anak-anak dari `buildNavMenu` (satu sumber dengan dropdown
                        desktop) — sudah memuat tautan ke halaman induk
                        ("Semua Layanan"), jadi TIDAK ditambah lagi di sini. */}
                    <ul className="ml-3 flex flex-col overflow-hidden border-l border-slate-100 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <Link
                href={user ? "/akun" : "/masuk"}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                <UserRound className="h-4 w-4" />
                {user ? "Akun Saya" : "Masuk"}
              </Link>
            )}
            <Link
              href="/keranjang"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ShoppingCart className="h-4 w-4" />
              Keranjang{count > 0 ? ` (${count})` : ""}
            </Link>
          </div>
          <TrackedWaButton
            location="navbar-mobile"
            href={waLink(WA_MESSAGES.general, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full"
          >
            <MessageCircle className="h-4 w-4" />
            Chat via WhatsApp
          </TrackedWaButton>
        </div>
      </motion.div>
    </header>
  );
}