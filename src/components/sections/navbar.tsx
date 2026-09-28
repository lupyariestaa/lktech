"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X, MessageCircle } from "lucide-react";
import { NAV_LINKS, PAGE_NAV_LINKS } from "@/lib/content";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { ButtonAnchor } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useSettings } from "@/components/settings-provider";
import { introDelay, useReducedMotionPreference } from "@/lib/intro";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotionPreference();
  const pathname = usePathname();
  const settings = useSettings();
  const isLanding = pathname === "/";
  const links = isLanding ? NAV_LINKS : PAGE_NAV_LINKS;
  // Intro loader hanya ada di landing; halaman dalam tampil langsung.
  const base = isLanding ? introDelay(reduced) : 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 z-[100] px-4 pt-3 sm:px-6">
      <motion.nav
        aria-label="Navigasi utama"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: base, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-5",
          scrolled
            ? "glass-strong shadow-lg shadow-slate-900/5"
            : "bg-transparent",
        )}
      >
        <Logo height={32} href="/" />

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary"
              >
                {link.label}
                <span className="absolute inset-x-4 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ButtonAnchor
            href="/kontak"
            size="sm"
            variant="primary"
            className="hidden sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Konsultasi
          </ButtonAnchor>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/70 text-secondary lg:hidden"
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
        className="mx-auto mt-2 max-w-6xl overflow-hidden lg:hidden"
      >
        <div className="glass-strong rounded-3xl p-3 shadow-lg">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <ButtonAnchor
            href={waLink(WA_MESSAGES.general, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full"
          >
            <MessageCircle className="h-4 w-4" />
            Chat via WhatsApp
          </ButtonAnchor>
        </div>
      </motion.div>
    </header>
  );
}
