import "server-only";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/**
 * Apakah kredensial Cloudinary lengkap tersedia (server-side).
 */
export const isCloudinaryConfigured = Boolean(
  cloudName && apiKey && apiSecret,
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/** Folder default penyimpanan gambar di Cloudinary. */
export const CLOUDINARY_FOLDER = "lktech";

/**
 * Folder yang diizinkan untuk upload, satu sumber kebenaran (dipakai oleh API
 * signature & UI). Semua path WAJIB berprefix `lktech/` agar konsisten dengan
 * kebijakan hapus aset.
 */
export const CLOUDINARY_FOLDERS = {
  portofolio: `${CLOUDINARY_FOLDER}/portofolio`,
  blog: `${CLOUDINARY_FOLDER}/blog`,
  produk: `${CLOUDINARY_FOLDER}/produk`,
  banner: `${CLOUDINARY_FOLDER}/banner`,
  lainnya: `${CLOUDINARY_FOLDER}/lainnya`,
} as const;

/** Daftar folder yang diizinkan (nilai) untuk validasi signature. */
export const ALLOWED_UPLOAD_FOLDERS: string[] = Object.values(CLOUDINARY_FOLDERS);

/** Format berkas yang diizinkan untuk upload gambar. */
export const ALLOWED_UPLOAD_FORMATS = ["jpg", "jpeg", "png", "webp", "avif"] as const;

/** Batas ukuran berkas upload (bytes) — 8 MB. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Shared signature untuk signed upload. Param yang ditandatangani HARUS sama
 * dengan yang dikirim klien ke Cloudinary (folder, timestamp, allowed_formats).
 */
export function createUploadSignature(params: { folder?: string } = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder =
    params.folder && ALLOWED_UPLOAD_FOLDERS.includes(params.folder)
      ? params.folder
      : CLOUDINARY_FOLDERS.lainnya;

  // Cloudinary menandatangani parameter secara alfabetis; `allowed_formats`
  // dikirim sebagai string berkoma.
  const allowedFormats = ALLOWED_UPLOAD_FORMATS.join(",");

  const toSign = {
    allowed_formats: allowedFormats,
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    toSign,
    apiSecret as string,
  );

  return {
    signature,
    timestamp,
    folder,
    allowedFormats,
    maxBytes: MAX_UPLOAD_BYTES,
    apiKey: apiKey as string,
    cloudName: cloudName as string,
  };
}

/**
 * Menghapus aset Cloudinary berdasarkan public_id (server-side).
 *
 * PENTING: hanya aset di dalam folder aplikasi (prefix `lktech/`) yang boleh
 * dihapus. Ini mencegah penghapusan aset Cloudinary lain (folder/env lain yang
 * berbagi akun) bila token admin bocor / disalahgunakan.
 */
export async function destroyAsset(publicId: string) {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary belum dikonfigurasi.");
  }
  const id = typeof publicId === "string" ? publicId.trim() : "";
  if (!id || !/^lktech\//.test(id) || id.includes("..")) {
    throw new Error("publicId tidak diizinkan (harus berada di folder lktech/).");
  }
  return cloudinary.uploader.destroy(id);
}

export { cloudinary };
