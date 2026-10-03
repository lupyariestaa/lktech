/** Satu alamat pengiriman tersimpan milik user. */
export type SavedAddress = {
  /** Id unik alamat (dibuat di server). */
  id: string;
  /** Label singkat, mis. "Rumah", "Kantor". */
  label: string;
  /** Nama penerima. */
  recipient: string;
  /** Nomor telepon/WhatsApp penerima. */
  phone: string;
  /** Alamat lengkap. */
  address: string;
  /** Kota/kabupaten. */
  city: string;
  /** Kode pos (opsional). */
  postalCode?: string;
  /** Catatan tambahan (opsional). */
  note?: string;
  /** Alamat utama — hanya satu yang `true` per user. */
  isPrimary: boolean;
};

/** Profil user yang tersimpan di Firestore (`users/{uid}`). */
export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
  orderCount: number;
  /** Slug produk favorit (wishlist), urut terbaru lebih dulu. */
  wishlist: string[];
  /** Alamat pengiriman tersimpan. */
  addresses: SavedAddress[];
};

/** Batas maksimum entri yang boleh disimpan user (anti-abuse). */
export const MAX_WISHLIST_ITEMS = 100;
export const MAX_ADDRESSES = 20;
