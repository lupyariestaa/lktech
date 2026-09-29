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
 * Menyediakan konten situs (layanan, FAQ, harga) ke komponen client.
 * Nilai awal dari server (layout) lalu disinkronkan dari /api/content.
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
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/content");
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
  }, []);

  return (
    <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
  );
}

export function useContent() {
  return useContext(ContentContext);
}
