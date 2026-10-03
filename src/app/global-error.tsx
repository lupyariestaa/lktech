"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Error boundary tingkat root (App Router). Wajib ada agar error yang muncul
 * di luar `error.tsx` (mis. di root layout) tetap tertangkap & dilaporkan
 * ke Sentry. Harus merender <html>/<body> sendiri.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#0f172a",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Terjadi kesalahan
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
            Maaf, ada masalah saat memuat halaman ini. Coba muat ulang; bila
            masih berlanjut, silakan kembali ke beranda.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 999,
              border: "none",
              background: "#004EDF",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
