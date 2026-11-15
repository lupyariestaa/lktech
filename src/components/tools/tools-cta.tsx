"use client";

import type { ReactNode } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { trackToolsCta } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ToolsCtaProps = {
  /** Konteks CTA untuk analytics (mis. "hero", "faq", "sticky"). */
  location: string;
  /** Tujuan setelah login. Default: ruang tools. */
  target?: string;
  variant?: "primary" | "outline" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Label kustom; default menyesuaikan status login. */
  children?: ReactNode;
  /** Tampilkan ikon gembok saat belum login. */
  withLock?: boolean;
  /** Tampilkan panah di ujung label. */
  withArrow?: boolean;
};

/**
 * CTA Tools yang sadar status login.
 *
 * - Belum login: langsung ke `/masuk?next=<target>` agar tidak ada flash layar
 *   `UserGuard`. Setelah login pengguna kembali ke tujuan.
 * - Sudah login: langsung ke target (default `/tools/ruang`).
 * - Saat auth masih dimuat, render varian "belum login" (sama dengan render
 *   server) agar tidak ada hydration mismatch.
 */
export function ToolsCta({
  location,
  target = "/tools/ruang",
  variant = "primary",
  size = "lg",
  className,
  children,
  withLock = true,
  withArrow = true,
}: ToolsCtaProps) {
  const { user } = useAuth();
  const loggedIn = Boolean(user);
  const href = loggedIn
    ? target
    : `/masuk?next=${encodeURIComponent(target)}`;
  const label = children ?? (loggedIn ? "Buka ruang tools" : "Masuk ke Tools");

  return (
    <ButtonLink
      href={href}
      variant={variant}
      size={size}
      className={cn("group", className)}
      onClick={() =>
        trackToolsCta({
          location,
          auth: loggedIn ? "in" : "out",
          target,
        })
      }
    >
      {!loggedIn && withLock && <Lock className="h-4 w-4" aria-hidden="true" />}
      {label}
      {withArrow && (
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </ButtonLink>
  );
}
