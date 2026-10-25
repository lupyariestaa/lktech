/**
 * Tipe & konstanta AUDIT LOG â€” AMAN untuk klien (tanpa `server-only`).
 * Data layer (I/O Firestore) ada di `@/lib/admin-audit`.
 */

export const ADMIN_AUDIT_ACTIONS = [
  "order.status",
  "order.delete",
  "order.fulfill",
  "order.invoice",
  "order.invoice.reconcile",
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
  "lead.activity",
  "lead.delete",
  "project.save",
  "project.delete",
  "content.update",
  "article.save",
  "article.delete",
  "article.publish",
  "article.unpublish",
  "article.duplicate",
  "article.bulk",
  "broadcast.send",
  "media.collection",
  "email.test",
  "admin.login",
  "admin.logout",
  "admin.add",
  "admin.remove",
  "settings.restore",
  "settings.backup_export",
  "settings.cache_clear",
  "settings.maintenance",
  "seo.insight_action",
  "seo.audit_run",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

/** Label tampilan per aksi. */
export const ADMIN_AUDIT_ACTION_LABEL: Record<AdminAuditAction, string> = {
  "order.status": "Ubah status pesanan",
  "order.delete": "Hapus pesanan",
  "order.fulfill": "Buat/kirim ulang unduhan",
  "order.invoice": "Buat invoice manual",
  "order.invoice.reconcile": "Rekonsiliasi invoice",
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
  "lead.activity": "Tambah aktivitas lead",
  "lead.delete": "Hapus lead",
  "project.save": "Simpan proyek",
  "project.delete": "Hapus proyek",
  "content.update": "Ubah konten situs",
  "article.save": "Simpan artikel",
  "article.delete": "Hapus artikel",
  "article.publish": "Terbitkan artikel",
  "article.unpublish": "Tarik artikel ke draft",
  "article.duplicate": "Duplikat artikel",
  "article.bulk": "Aksi massal artikel",
  "broadcast.send": "Kirim broadcast newsletter",
  "media.collection": "Ubah koleksi media",
  "email.test": "Kirim email uji",
  "admin.login": "Login admin",
  "admin.logout": "Logout admin",
  "admin.add": "Tambah admin",
  "admin.remove": "Hapus admin",
  "settings.restore": "Pulihkan dari backup",
  "settings.backup_export": "Ekspor backup",
  "settings.cache_clear": "Bersihkan cache",
  "settings.maintenance": "Ubah mode pemeliharaan",
  "seo.insight_action": "Tindak lanjut insight SEO",
  "seo.audit_run": "Jalankan audit SEO teknis",
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
