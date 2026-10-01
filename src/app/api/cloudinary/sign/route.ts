import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  createUploadSignature,
  isCloudinaryConfigured,
  ALLOWED_UPLOAD_FOLDERS,
} from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cloudinary/sign
 * Mengembalikan parameter signed upload (dilindungi admin).
 * Body opsional: { folder?: string }
 *
 * Folder hanya boleh dari daftar `ALLOWED_UPLOAD_FOLDERS` (prefix `lktech/`).
 * Signature juga mengikat `allowed_formats` sehingga tipe berkas dibatasi.
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

  let folder: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.folder === "string" && body.folder.trim()) {
      folder = body.folder.trim();
    }
  } catch {
    /* body opsional */
  }

  // Tolak folder yang tidak dikenal (lebih aman dari sekadar mengganti diam-diam).
  if (folder && !ALLOWED_UPLOAD_FOLDERS.includes(folder)) {
    return NextResponse.json(
      { error: `Folder "${folder}" tidak diizinkan.` },
      { status: 400 },
    );
  }

  try {
    const sig = createUploadSignature({ folder });
    return NextResponse.json(sig);
  } catch (err) {
    console.error("[api/cloudinary/sign] gagal:", err);
    return NextResponse.json(
      { error: "Gagal membuat signature upload." },
      { status: 500 },
    );
  }
}
