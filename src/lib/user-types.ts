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
  /** Nomor WhatsApp user — digit ternormalisasi (mis. "6281234567890"). */
  whatsapp: string;
  /** User diblokir (mis. spam) — penanda admin. */
  blocked: boolean;
};

/** Batas maksimum entri yang boleh disimpan user (anti-abuse). */
export const MAX_WISHLIST_ITEMS = 100;
export const MAX_ADDRESSES = 20;

/**
 * Baris ringkas user untuk dashboard admin ("Kelola User").
 * Menggabungkan profil + agregat pesanan.
 */
export type AdminUserRow = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  provider: string;
  whatsapp: string;
  blocked: boolean;
  createdAt: string;
  lastLoginAt: string;
  /** Jumlah pesanan nyata (dihitung dari order). */
  orderCount: number;
  /** Total belanja (Rp) — Σ total order. */
  totalSpent: number;
  /** Apakah user pernah memesan. */
  hasOrders: boolean;
};

/** Ringkasan statistik user untuk kartu & badge dashboard. */
export type AdminUsersSummary = {
  total: number;
  /** User yang mendaftar dalam 30 hari terakhir. */
  newLast30Days: number;
  /** User yang punya minimal 1 pesanan. */
  withOrders: number;
  /** User yang belum pernah memesan. */
  withoutOrders: number;
};
