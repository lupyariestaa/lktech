import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Sembunyikan header "X-Powered-By: Next.js".
  poweredByHeader: false,

  // Biarkan paket server-only besar tetap external (jangan di-bundle).
  // Kombinasi ini + `overrides.jose` di package.json menyelesaikan
  // konflik ESM (jwks-rsa require() jose) yang muncul di Vercel.
  serverExternalPackages: ["firebase-admin", "cloudinary"],

  // Optimasi import paket besar (tree-shaking per-ikon).
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Avatar akun Google (photoURL dari Firebase Auth).
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Header keamanan & performa dasar.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Mitigasi clickjacking (ADM-05). XFO untuk browser lama;
          // frame-ancestors untuk browser modern.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          // HSTS hanya di produksi; header pada HTTP diabaikan browser.
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      {
        // PWA (B2): service worker tidak boleh di-cache lama agar update
        // cepat terpasang. Browser modern juga mem-bypass HTTP cache untuk SW.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Tanpa `org`/`project`, langkah upload source map dilewati otomatis.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Token hanya perlu bila ingin upload source map (opsional).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Jangan tampilkan log build Sentry yang berisik.
  silent: true,

  // Sembunyikan source map dari publik (aman) bila diupload.
  widenClientFileUpload: true,

  // Jika tidak ada auth token, jangan gagal build saat upload source map.
  // (Sentry otomatis skip bila org/project/token tidak lengkap.)
  telemetry: false,
});
