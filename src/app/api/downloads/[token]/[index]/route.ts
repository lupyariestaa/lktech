import { NextResponse } from "next/server";
import { getGrantByToken, recordDownloadHit } from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/downloads/[token]/[index] — menyajikan berkas unduhan.
 *
 * - Validasi token (HMAC) & grant (kedaluwarsa/batas unduhan) via `downloads.ts`.
 * - Catat 1 hit (best-effort) lalu **redirect** ke URL berkas (Cloudinary/CDN).
 * - Tidak menyajikan berkas langsung, sehingga tidak memproses byte di server.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; index: string }> },
) {
  const { token, index } = await params;
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) {
    return NextResponse.json({ error: "Indeks berkas tidak valid." }, { status: 400 });
  }

  // Validasi awal (tanpa menambah hit) untuk pesan error yang tepat.
  const check = await getGrantByToken(token);
  if (!check.ok) {
    return NextResponse.json(
      {
        error:
          check.reason === "expired"
            ? "Tautan unduhan sudah kedaluwarsa."
            : check.reason === "exhausted"
              ? "Batas unduhan sudah tercapai."
              : "Tautan unduhan tidak valid.",
      },
      { status: check.reason === "invalid" ? 400 : 410 },
    );
  }

  const file = check.grant.files[idx];
  if (!file) {
    return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  }

  // Catat unduhan (best-effort; tetap lanjut bila pencatatan gagal).
  await recordDownloadHit(token);

  // Arahkan ke berkas asli.
  return NextResponse.redirect(file.url, 302);
}
