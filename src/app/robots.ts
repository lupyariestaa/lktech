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
          // Halaman unduhan bertoken: bersifat pribadi — jangan diindeks.
          "/unduhan",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
