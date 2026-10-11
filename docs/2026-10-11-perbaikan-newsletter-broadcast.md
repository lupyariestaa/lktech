# Perbaikan Sistem "Newsletter & Broadcast" — Audit & Remediasi P0

> **Status: ✅ SELESAI (P0, kode).** Turunan dari audit mandiri sistem Newsletter
> & Broadcast. Fokus P0: memperbaiki **tautan unsubscribe yang rusak total**
> (newsletter & cart). Disusun & dieksekusi: 2026-10-11.

---

## 0. Ringkasan

Audit menemukan **bug kritis**: tautan "Berhenti berlangganan" (newsletter) dan
"Berhenti diingatkan" (pengingat keranjang) **selalu ditolak** karena mismatch
tanda tangan HMAC. Sesi ini memperbaiki keduanya (P0) + menambah test regresi.

## 1. Temuan P0 (terverifikasi)

- **F-N1 — Unsubscribe newsletter rusak 100%.** Penandatanganan memakai
  `signTokenId("newsletter-unsub:" + email, secret)`
  (`newsletter.ts`) tetapi verifikasi `parseToken(`${email}.${sig}`)` =
  HMAC tanpa prefix → tidak pernah cocok → endpoint selalu **401**.
- **F-N2 — Unsubscribe cart rusak 100% (bug identik).**
  `signUnsub(uid)` = HMAC(`cart-unsub:${uid}`) vs verifikasi HMAC(`uid`).

Bukti empiris (kode asli dijalankan): `verified === null`, `COCOK? false` untuk
keduanya.

**Dampak:** pelanggan tidak bisa unsubscribe dari email broadcast maupun
pengingat keranjang (juga isu kepatuhan).

## 2. Perbaikan

### Akar masalah
Nilai/`tokenId` yang **ditandatangani** (ber-prefix) berbeda dari yang
**diverifikasi** (id mentah). Modul baru menyatukan penandatanganan & verifikasi
agar prefix konsisten di kedua sisi.

### Berkas baru
- `src/lib/unsubscribe-token.ts` — modul **murni** (implementasi HMAC inline,
  bebas impor alias agar dapat diuji) berisi `tokenId` kanonik + penandatangan +
  verifikasi untuk cart & newsletter.
- `scripts/unsubscribe-token.test.ts` — 10 test regresi.

### Berkas diubah
- `src/lib/newsletter.ts` — `signNewsletterUnsub` memakai helper; `unsubSecret`
  diekspor (untuk konsistensi).
- `src/app/api/newsletter/unsubscribe/route.ts` — verifikasi via
  `verifyNewsletterUnsubToken` (tokenId ber-prefix).
- `src/lib/cart-reminder.ts` — `signUnsub` memakai helper; `cartUnsubSecret`
  diekspor.
- `src/app/api/cart/unsubscribe/route.ts` — verifikasi via `verifyCartUnsub`.
- `package.json` — script `test:unsub`.
- `tsconfig.json` — exclude test baru.

### Catatan kompatibilitas
Tanda tangan **tidak berubah** (penandatangan lama juga memakai tokenId
ber-prefix yang sama) — hanya **verifikasi** yang diperbaiki. Jadi **tautan lama
yang sudah beredar tetap valid**; tidak ada migrasi data.

## 3. Hasil

**Status: ✅ SELESAI (P0, kode).**

- `npx tsc --noEmit` bersih ✅
- `npx eslint . --max-warnings=0` bersih ✅
- Semua `test:*` hijau ✅ (**354** test; `test:unsub` baru = 10)
- `npm run build` sukses ✅

**Sisa (P1+, belum dikerjakan):** UI daftar subscriber, pratinjau/kirim-uji,
perbaikan `segmentCounts` cacat, header `List-Unsubscribe`, riwayat broadcast,
akurasi segmen "pernah beli", ketahanan pengiriman, dll.

**Uji manual:** klik tautan "Berhenti berlangganan" dari email broadcast &
"Berhenti diingatkan" dari email pengingat keranjang → harus berhasil (200).
