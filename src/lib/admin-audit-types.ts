/**
 * Tipe & konstanta AUDIT LOG â€” AMAN untuk klien (tanpa `server-only`).
 * Data layer (I/O Firestore) ada di `@/lib/admin-audit`.
 */

export const ADMIN_AUDIT_ACTIONS = [
  "order.status",
  "order.delete",
  "order.fulfill",
  "order.invoice",
  "order.resend_email",
  "product.save",
  "product.delete",
  "coupon.save",
  "coupon.delete",
  "coupon.restore",
  "user.block",
  "user.delete",
  "settings.update",
  "review.moderate",
  "review.delete",
  "lead.status",
  "lead.delete",
  "article.save",
  "article.delete",
  "article.publish",
  "article.unpublish",
  "article.duplicate",
  "article.bulk",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

/** Label tampilan per aksi. */
export const ADMIN_AUDIT_ACTION_LABEL: Record<AdminAuditAction, string> = {
  "order.status": "Ubah status pesanan",
  "order.delete": "Hapus pesanan",
  "order.fulfill": "Buat/kirim ulang unduhan",
  "order.invoice": "Buat invoice manual",
  "order.resend_email": "Kirim ulang email pesanan",
  "product.save": "Simpan produk",
  "product.delete": "Hapus produk",
  "coupon.save": "Simpan kupon",
  "coupon.delete": "Arsipkan kupon",
  "coupon.restore": "Pulihkan kupon",
  "user.block": "Blokir/buka blokir pengguna",
  "user.delete": "Hapus pengguna",
  "settings.update": "Ubah pengaturan",
  "review.moderate": "Moderasi ulasan",
  "review.delete": "Hapus ulasan",
  "lead.status": "Ubah status lead",
  "lead.delete": "Hapus lead",
  "article.save": "Simpan artikel",
  "article.delete": "Hapus artikel",
  "article.publish": "Terbitkan artikel",
  "article.unpublish": "Tarik artikel ke draft",
  "article.duplicate": "Duplikat artikel",
  "article.bulk": "Aksi massal artikel",
};

/** Entri audit tersimpan. */
export type AdminAuditEntry = {
  id: string;
  action: AdminAuditAction | string;
  actor: string;
  /** Ringkasan singkat target (mis. kode order, slug produk, email user). */
  target: string;
  /** Konteks tambahan (mis. status before/after) â€” non-sensitif. */
  meta?: Record<string, unknown>;
  atISO: string;
};
