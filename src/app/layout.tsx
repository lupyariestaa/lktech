import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings";
import { getSiteContent } from "@/lib/site-content";
import { SkipLink } from "@/components/skip-link";
import { StructuredData } from "@/components/structured-data";
import { SettingsProvider } from "@/components/settings-provider";
import { ContentProvider } from "@/components/content-provider";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: "%s | LKTech",
  },
  description: SITE.description,
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: SITE.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: [SITE.ogImage],
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
        <SettingsProvider initial={settings}>
          <ContentProvider initial={content}>
            {children}
            <StructuredData settings={settings} />
          </ContentProvider>
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}
