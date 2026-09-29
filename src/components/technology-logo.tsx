"use client";

import Image from "next/image";
import { useState } from "react";
import type { TechItem } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Inisial dari nama teknologi (maks 2 huruf), mis. "Next.js" -> "NE". */
function initials(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Kartu logo satu teknologi.
 * - Bila `item.logo` diisi & file tersedia, tampilkan logo asli.
 * - Bila `item.wordmark` true, SVG sudah memuat nama brand → sembunyikan label teks
 *   dan tampilkan logo lebih besar (mengisi kartu).
 * - Bila logo kosong / gagal dimuat, tampilkan placeholder inisial + warna brand.
 */
export function TechnologyLogo({ item }: { item: TechItem }) {
  const [failed, setFailed] = useState(false);
  const useImage = Boolean(item.logo) && !failed;
  // Tampilkan hanya logo untuk SVG wordmark (yang sudah berisi nama brand).
  const showLabel = !item.wordmark;

  return (
    <div className="group flex h-16 items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-surface px-5 whitespace-nowrap transition-colors hover:border-primary/20 hover:bg-white">
      {useImage ? (
        item.wordmark ? (
          // Wordmark: tampilkan logo lebar (sudah memuat teks) mengisi kartu.
          <Image
            src={item.logo}
            alt={item.name}
            width={140}
            height={36}
            className="h-8 w-auto max-w-[150px] object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <>
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl">
              <Image
                src={item.logo}
                alt={item.name}
                width={36}
                height={36}
                className="h-7 w-7 object-contain"
                onError={() => setFailed(true)}
              />
            </span>
            {showLabel && (
              <span className="text-sm font-semibold text-slate-500 transition-colors group-hover:text-secondary">
                {item.name}
              </span>
            )}
          </>
        )
      ) : (
        <>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold text-white",
            )}
            style={{ backgroundColor: item.color }}
          >
            {initials(item.name)}
          </span>
          {showLabel && (
            <span className="text-sm font-semibold text-slate-500 transition-colors group-hover:text-secondary">
              {item.name}
            </span>
          )}
        </>
      )}
    </div>
  );
}
