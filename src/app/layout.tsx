import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings";
import { resolveSeo } from "@/lib/seo-pure";
import { getSiteContent } from "@/lib/site-content";
import { SkipLink } from "@/components/skip-link";
import { StructuredData } from "@/components/structured-data";
import { SettingsProvider } from "@/components/settings-provider";
import { ContentProvider } from "@/components/content-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AccountStatusProvider } from "@/components/account-status-provider";
import { CartProvider } from "@/components/cart-provider";
import { CartDraftSync } from "@/components/cart-draft-sync";
import { WishlistProvider } from "@/components/wishlist-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

/**
 * Metadata default dari konstanta `SITE`, dengan override dari pengaturan SEO
 * dashboard (`settings.seo`) — lihat gap G1. `generateMetadata` (async) membaca
 * `getSiteSettings()` sehingga Meta Title/Description/OG/verification yang diisi
 * admin BENAR-BENAR berpengaruh ke seluruh situs. Halaman yang menetapkan
 * metadata sendiri tetap menang (override per-halaman).
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const seo = resolveSeo(settings.seo);

  const title = seo.title ?? SITE.title;
  const description = seo.description ?? SITE.description;
  const ogImage = seo.ogImage ?? SITE.ogImage;

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: title,
      template: "%s | LKTech",
    },
    description,
    keywords: [
      "LKTech",
      "jasa pembuatan website",
      "aplikasi mobile",
      "konsultasi teknologi",
      "jasa IT Tasikmalaya",
      "landing page",
      "web development",
    ],
    applicationName: SITE.name,
    authors: [{ name: SITE.name }],
    creator: SITE.name,
    publisher: SITE.name,
    // Catatan (S1/R1): canonical TIDAK lagi ditetapkan global di root. Setiap
    // halaman WAJIB menetapkan canonical sendiri (lihat `alternates.canonical`
    // di tiap page.tsx) agar tidak bocor ke "/" (duplikasi/kanibalisasi).
    // Halaman privat cukup `noindex` (lihat halaman terkait).
    alternates: {
      types: {
        "application/rss+xml": [{ url: "/blog/rss.xml", title: "LKTech Blog RSS" }],
      },
    },
    // Verification Google Search Console — hanya disertakan bila diisi admin
    // (sebelumnya form "menjanjikan" tag ini tetapi tak pernah di-render → G1).
    ...(seo.searchConsoleId
      ? { verification: { google: seo.searchConsoleId } }
      : {}),
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url: SITE.url,
      siteName: SITE.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#004EDF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  const content = await getSiteContent();

  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <SkipLink />
        <AuthProvider>
          <AccountStatusProvider>
            <SettingsProvider initial={settings}>
              <ContentProvider initial={content}>
                <WishlistProvider>
                  <CartProvider>
                    {children}
                    <CartDraftSync />
                    <StructuredData settings={settings} />
                  </CartProvider>
                </WishlistProvider>
              </ContentProvider>
            </SettingsProvider>
          </AccountStatusProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
