import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Sembunyikan header "X-Powered-By: Next.js".
  poweredByHeader: false,

  // Jangan bundle paket server-only besar (firebase-admin & cloudinary);
  // biarkan Node me-require langsung. Mencegah error saat build/deploy serverless.
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
