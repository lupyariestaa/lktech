import { ImageResponse } from "next/og";

export const alt =
  "LKTech — Jasa Website, Aplikasi Mobile & Produk Digital";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #004EDF 0%, #003BB3 55%, #0A0F1E 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#ffffff",
              color: "#004EDF",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            LK
          </div>
          <div style={{ color: "#ffffff", fontSize: 34, fontWeight: 700 }}>
            LKTech
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Teknologi Modern,
          </div>
          <div
            style={{
              color: "#BBD1FF",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Hasil Nyata
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Website", "Aplikasi Mobile", "Produk Digital"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 24,
                fontWeight: 600,
                padding: "12px 24px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
