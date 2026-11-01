import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          // Halaman akun/keranjang: tidak perlu diindeks (juga `noindex` per-halaman).
          "/akun",
          "/keranjang",
          "/masuk",
          // Area tools khusus pengguna login: tidak perlu diindeks.
          "/tools",
          "/tools/",
          // Halaman unduhan bertoken: bersifat pribadi — jangan diindeks.
          "/unduhan",
          // Halaman fallback offline PWA — bukan konten nyata.
          "/offline",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
