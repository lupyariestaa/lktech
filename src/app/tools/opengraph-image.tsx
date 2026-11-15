import { ImageResponse } from "next/og";

/** Metadata gambar Open Graph untuk landing `/tools`. */
export const alt =
  "LKTech Tools — Berkas beres, tanpa unggah. Lima tool yang diproses lokal di browser.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG image statis (dibuat saat build). Memakai `ImageResponse` tanpa aset font
 * eksternal agar tidak menambah request atau dependensi.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f8fafc",
          padding: "56px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#004edf",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              LK
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginLeft: 14,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: "#0a0f1e" }}>
                LKTech Tools
              </span>
              <span style={{ fontSize: 15, color: "#64748b" }}>
                Ruang kerja lokal
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 999,
              background: "#eef3ff",
              color: "#004edf",
              padding: "10px 18px",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Gratis dengan akun LKTech
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flex: 1,
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 620,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#004edf",
                padding: "8px 16px",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Gambar · PDF · Warna · Teks
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 70,
                lineHeight: 1.04,
                fontWeight: 700,
                color: "#0a0f1e",
                marginTop: 22,
                letterSpacing: "-2px",
              }}
            >
              Berkas beres,
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 70,
                lineHeight: 1.04,
                fontWeight: 700,
                color: "#004edf",
                marginTop: 2,
                letterSpacing: "-2px",
              }}
            >
              tanpa unggah.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 25,
                lineHeight: 1.45,
                color: "#64748b",
                marginTop: 22,
              }}
            >
              Kompres gambar, susun PDF, ambil warna, dan rapikan teks —
              semuanya diproses lokal di browser.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 380,
              borderRadius: 28,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              padding: "24px",
              boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 19, fontWeight: 700, color: "#0a0f1e" }}>
                Gambar ke WebP
              </span>
              <span
                style={{
                  display: "flex",
                  borderRadius: 999,
                  background: "#ecfdf5",
                  color: "#047857",
                  padding: "6px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Selesai
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 150,
                  borderRadius: 14,
                  background: "#f8fafc",
                  padding: "12px",
                }}
              >
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  foto-produk.png
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#0a0f1e" }}>
                  4,8 MB
                </span>
              </div>
              <span style={{ fontSize: 22, color: "#cbd5e1" }}>→</span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 150,
                  borderRadius: 14,
                  background: "#ecfdf5",
                  padding: "12px",
                }}
              >
                <span style={{ fontSize: 13, color: "#047857" }}>
                  foto-produk.webp
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#047857" }}>
                  812 KB
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                height: 8,
                borderRadius: 999,
                background: "#e2e8f0",
                marginTop: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: 8,
                  borderRadius: 999,
                  background: "#004edf",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                fontSize: 13,
              }}
            >
              <span style={{ color: "#047857", fontWeight: 600 }}>
                −83% ukuran
              </span>
              <span style={{ color: "#64748b" }}>0 byte diunggah</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #e2e8f0",
            paddingTop: 20,
            fontSize: 17,
            color: "#64748b",
          }}
        >
          <span>lktech.id/tools</span>
          <span>5 tool · Tanpa instalasi · Tanpa unggah berkas</span>
        </div>
      </div>
    ),
    size,
  );
}
