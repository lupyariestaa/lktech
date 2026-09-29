"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  defaultSiteContent,
  type SiteContent,
} from "@/lib/content-types";

const ContentContext = createContext<SiteContent>(defaultSiteContent());

/**
 * Menyediakan konten situs (layanan, FAQ, harga, hero) ke komponen client.
 *
 * Konten awal diberikan dari server (root layout via `getSiteContent()`) sehingga
 * sudah SEGAR per-request. Refetch dari `/api/content` hanya dilakukan bila server
 * tidak menyediakan `initial` (mis. saat dipakai di luar layout). Endpoint tersebut
 * kini `no-store`, jadi tidak ada lagi masalah data basi yang menimpa data segar.
 */
export function ContentProvider({
  initial,
  children,
}: {
  initial?: SiteContent;
  children: ReactNode;
}) {
  const [content, setContent] = useState<SiteContent>(
    initial ?? defaultSiteContent(),
  );

  useEffect(() => {
    // Bila server sudah mengirim konten, jangan timpa dengan fetch (SSR lebih segar
    // & menghindari flicker). Hanya fetch bila tidak ada initial.
    if (initial) {
      setContent(initial);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.content) setContent(data.content);
      } catch {
        /* pakai default */
      }
    })();
    return () => {
      active = false;
    };
  }, [initial]);

  return (
    <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
  );
}

export function useContent() {
  return useContext(ContentContext);
}
