import type { NextConfig } from "next";

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

export default nextConfig;
