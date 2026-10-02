# Dokumentasi Pengembangan LKTech

Folder ini berisi dokumentasi pengembangan (development docs) untuk proyek
LKTech — bukan dokumentasi user-facing. Semua catatan teknis, rencana, alur
implementasi, dan status task ditulis di sini agar rapi & mudah dilacak.

## Konvensi penamaan

```
docs/
  README.md                         # indeks ini
  YYYY-MM-DD-<slug-fitur>.md        # satu dokumen per task/fitur besar
```

Contoh: `2026-02-14-auth-split-dan-produk.md`

## Isi yang disarankan per dokumen

- **Ringkasan** — apa yang dikerjakan & mengapa.
- **Tujuan / Scope** — batasan jelas (in-scope & out-of-scope).
- **Keputusan desain** — pilihan arsitektur + alasan (dan alternatif yang ditolak).
- **Alur implementasi** — langkah/tahapan teknis.
- **Daftar file** — file baru/diubah beserta perannya.
- **Status task** — checklist progres (Done / In Progress / Todo).
- **Catatan operasional** — env, migrasi data, langkah manual, dll.

## Daftar dokumen

| Tanggal    | Dokumen                                                                 | Status      |
| ---------- | ----------------------------------------------------------------------- | ----------- |
| 2026-02-14 | [Auth split (admin/user) + Sistem Produk](2026-02-14-auth-split-dan-produk.md) | In Progress |
| 2026-10-02 | [Rencana Upgrade Sistem Media (M1–M6)](2026-10-02-media-system-upgrade.md) | Rencana |
| 2026-10-02 | [Upgrade Sidebar Dashboard Admin (audit UI/UX + task flow)](2026-10-02-sidebar-dashboard-upgrade.md) | Selesai |
| 2026-10-02 | [Modul Admin Orders/Pesanan (audit + task flow)](2026-10-02-orders-admin-module.md) | Selesai |
| 2026-10-02 | [Revisi Sistem Produk (galeri, lightbox, ratio 16:9, kanvas paket, alur pilih paket)](2026-10-02-revisi-sistem-produk.md) | Selesai |
