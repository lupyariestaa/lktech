import { getIdToken } from "@/lib/auth";

export type CloudinaryAsset = {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  createdAt: string;
};

/**
 * Menghasilkan URL Cloudinary yang dioptimalkan (f_auto: WebP/AVIF, q_auto).
 * `publicId` boleh berisi transformasi tambahan di depan (mis. "c_fill,w_800").
 */
export function cldUrl(publicId: string, transforms = "f_auto,q_auto") {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return "";
  const t = transforms ? `${transforms}/` : "";
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}${publicId}`;
}

/**
 * Mengunggah file gambar via signed upload.
 * Langkah: minta signature ke API (admin) → unggah langsung ke Cloudinary.
 */
export async function uploadImage(
  file: File,
  opts: { folder?: string; onProgress?: (pct: number) => void } = {},
): Promise<CloudinaryAsset> {
  const token = await getIdToken();
  if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");

  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(opts.folder ? { folder: opts.folder } : {}),
  });

  if (!signRes.ok) {
    const data = await signRes.json().catch(() => ({}));
    throw new Error(data?.error ?? "Gagal menyiapkan upload.");
  }

  const { signature, timestamp, folder, apiKey, cloudName, allowedFormats, maxBytes } =
    await signRes.json();

  // Cek ukuran di klien untuk pesan cepat (server/Cloudinary tetap menolak bila
  // melampaui batas yang ditandatangani).
  if (typeof maxBytes === "number" && file.size > maxBytes) {
    const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    throw new Error(`Ukuran berkas terlalu besar (maks ${mb} MB).`);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  // Harus cocok dengan parameter yang ditandatangani server.
  if (allowedFormats) form.append("allowed_formats", allowedFormats);

  // Upload dengan XMLHttpRequest agar bisa memantau progres.
  return new Promise<CloudinaryAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let res: {
        public_id?: string;
        secure_url?: string;
        width?: number;
        height?: number;
        format?: string;
        bytes?: number;
        created_at?: string;
        error?: { message?: string } | string;
      } = {};
      try {
        res = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error(`Respons upload tidak valid (HTTP ${xhr.status}).`));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && res.public_id) {
        resolve({
          publicId: res.public_id,
          secureUrl: res.secure_url ?? "",
          width: res.width ?? 0,
          height: res.height ?? 0,
          format: res.format ?? "",
          bytes: res.bytes ?? 0,
          createdAt: res.created_at ?? new Date().toISOString(),
        });
        return;
      }

      // Ambil pesan error dari Cloudinary (bisa object atau string).
      const msg =
        typeof res.error === "string"
          ? res.error
          : (res.error?.message ?? `Upload gagal (HTTP ${xhr.status}).`);
      reject(new Error(msg));
    };

    xhr.onerror = () => reject(new Error("Koneksi upload terputus."));
    xhr.send(form);
  });
}

/** Menghapus aset Cloudinary lewat API admin. */
export async function deleteImage(publicId: string) {
  const token = await getIdToken();
  if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");

  const res = await fetch("/api/cloudinary/destroy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Gagal menghapus gambar.");
  }
  return res.json();
}
