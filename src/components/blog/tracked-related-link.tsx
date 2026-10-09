"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackRelatedClick } from "@/lib/analytics";

/**
 * Tautan ke artikel lain yang mencatat `related_click` (B8.1).
 * Client component kecil agar sidebar tetap bisa dirender di server.
 */
export function TrackedRelatedLink({
  from,
  to,
  placement,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  from: string;
  to: string;
  placement: string;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackRelatedClick({ from, to, placement });
        onClick?.(e);
      }}
    />
  );
}
