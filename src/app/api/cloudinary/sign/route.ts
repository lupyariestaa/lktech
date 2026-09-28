import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  createUploadSignature,
  isCloudinaryConfigured,
  CLOUDINARY_FOLDERS,
} from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Folder yang diizinkan untuk upload (mencegah folder sembarangan). */
const ALLOWED_FOLDERS: string[] = Object.values(CLOUDINARY_FOLDERS);

/**
 * POST /api/cloudinary/sign
 * Mengembalikan parameter signed upload (dilindungi admin).
 * Body opsional: { folder?: string }
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

  // Hanya izinkan folder yang dikenal; selain itu pakai folder "lainnya".
  if (folder && !ALLOWED_FOLDERS.includes(folder)) {
    folder = CLOUDINARY_FOLDERS.lainnya;
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
