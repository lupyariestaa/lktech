import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { destroyAsset, isCloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cloudinary/destroy
 * Menghapus aset Cloudinary berdasarkan public_id (dilindungi admin).
 * Body: { publicId: string }
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary belum dikonfigurasi di server." },
      { status: 503 },
    );
  }

  let publicId: string | undefined;
  try {
    const body = await req.json();
    publicId = typeof body?.publicId === "string" ? body.publicId : undefined;
  } catch {
    /* */
  }

  if (!publicId) {
    return NextResponse.json(
      { error: "publicId wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const result = await destroyAsset(publicId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/cloudinary/destroy] gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus gambar." },
      { status: 500 },
    );
  }
}
