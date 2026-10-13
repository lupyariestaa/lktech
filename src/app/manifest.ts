import type { MetadataRoute } from "next";
import { PWA_ICONS, PWA_NAME, PWA_SHORT_NAME, PWA_THEME_COLOR } from "@/lib/pwa";

/**
 * Manifest PWA (Tema 3.5, B2).
 *
 * `app/manifest.ts` dibaca Next otomatis → `<link rel="manifest">` disuntik ke
 * setiap halaman. Ikon memakai file statis `public/icons/*` (URL stabil) agar
 * Android/Chrome dapat mengambilnya apa adanya.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description:
      "Jasa pembuatan website, aplikasi mobile, dan produk digital. Konsultasi gratis, hasil berkualitas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: PWA_THEME_COLOR,
    lang: "id",
    dir: "ltr",
    categories: ["business", "shopping", "productivity"],
    icons: [
      { src: PWA_ICONS.p192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: PWA_ICONS.p512, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: PWA_ICONS.maskable,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Produk",
        short_name: "Produk",
        url: "/produk",
        description: "Lihat produk digital LKTech",
      },
      {
        name: "Konsultasi",
        short_name: "Kontak",
        url: "/kontak",
        description: "Hubungi LKTech",
      },
    ],
    // Identitas app (start URL).
    id: "/",
  };
}