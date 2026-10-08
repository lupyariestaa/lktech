/**
 * Batas ukuran berkas upload gambar (bytes). Satu sumber untuk server
 * (signature) dan klien (validasi sebelum unggah). Tanpa dependensi, aman
 * dipakai di client maupun server.
 */
export const MAX_UPLOAD_MB = 8;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
