import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

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
