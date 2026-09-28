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
 * Folder yang diizinkan untuk upload (konsisten dengan kategori media).
 */
export const CLOUDINARY_FOLDERS = {
  portofolio: `${CLOUDINARY_FOLDER}/portofolio`,
  banner: `${CLOUDINARY_FOLDER}/banner`,
  lainnya: `${CLOUDINARY_FOLDER}/lainnya`,
} as const;

/**
 * Menghasilkan parameter signed upload untuk digunakan di sisi klien.
 * Secret TIDAK pernah dikirim ke browser; hanya signature turunannya.
 */
export function createUploadSignature(params: { folder?: string } = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = params.folder ?? CLOUDINARY_FOLDERS.portofolio;

  const toSign = {
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
    apiKey: apiKey as string,
    cloudName: cloudName as string,
  };
}

/**
 * Menghapus aset Cloudinary berdasarkan public_id (server-side).
 */
export async function destroyAsset(publicId: string) {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary belum dikonfigurasi.");
  }
  return cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
