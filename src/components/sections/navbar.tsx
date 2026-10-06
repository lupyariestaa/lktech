"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X, MessageCircle, ShoppingCart, UserRound, LayoutDashboard } from "lucide-react";
import { NAV_LINKS, PAGE_NAV_LINKS } from "@/lib/content";
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

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotionPreference();
  const pathname = usePathname();
  const settings = useSettings();
  const { count, ready } = useCart();
  const { user } = useAuth();
  const isLanding = pathname === "/";
  const links = isLanding ? NAV_LINKS : PAGE_NAV_LINKS;
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

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              >
                {link.label}
                <span className="absolute inset-x-3.5 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
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

      {/* Mobile menu */}
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
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
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
