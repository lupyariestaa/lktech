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
          // Landing tools publik (`/tools`) boleh diindeks; ruang & workspace
          // (semua sub-path di bawahnya) privat — tidak perlu diindeks.
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
