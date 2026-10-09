"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackBlogCta } from "@/lib/analytics";

/**
 * Tautan CTA di halaman blog yang mencatat `cta_click` (B8.1).
 * Dipakai untuk CTA layanan di sidebar, bukan untuk artikel terkait.
 */
export function TrackedBlogCta({
  slug,
  cta,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  slug: string;
  cta: string;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackBlogCta({ slug, cta });
        onClick?.(e);
      }}
    />
  );
}
