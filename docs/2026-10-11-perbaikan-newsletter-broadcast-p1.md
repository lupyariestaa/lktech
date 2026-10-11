# Perbaikan Sistem "Newsletter & Broadcast" — P1/P2/P3 (Lanjutan)

> **Status: ✅ SELESAI (P1–P3, kode).** Melanjutkan perbaikan P0
> ([`2026-10-11-perbaikan-newsletter-broadcast.md`](2026-10-11-perbaikan-newsletter-broadcast.md)).
> Disusun & dieksekusi: 2026-10-11.

---

## 0. Ringkasan

Setelah P0 (bug tautan unsubscribe), sesi ini menuntaskan gap P1–P3: **UI daftar
pelanggan**, **pratinjau + kirim uji + estimasi penerima**, **perbaikan
`segmentCounts`**, **header `List-Unsubscribe`**, **riwayat broadcast**, **akurasi
segmen dari `orders`**, dan **ketahanan pengiriman**.

## 1. Perubahan

### Data layer & logika murni
- **Baru:** `src/lib/newsletter-pure.ts` — logika murni (normalisasi subscriber,
  segmen, validasi broadcast, hitung penerima). Aman klien & dapat diuji.
- `src/lib/newsletter-types.ts` — re-export dari pure (satu sumber).
- `src/lib/newsletter.ts`:
  - **Segmen "pernah beli" dari koleksi `orders`** (status non-batal/kedaluwarsa),
    bukan `users.orderCount` yang bisa drift (F-N9). Cap dinaikkan & terdokumentasi.
  - `getBroadcastOverview()` — ringkasan + jumlah per segmen **satu pemuatan**.
  - Re-subscribe **aman** (F-N11): `createdAtISO` asli dipertahankan, `unsubscribedAtISO` dibersihkan.
  - Ekspor mati (`getSubscribersSummary`, `getSegmentCounts`) dihapus (digantikan overview).
- **Baru:** `src/lib/broadcast-log.ts` — riwayat broadcast (`broadcasts/{id}`).

### Email
- `src/lib/email-broadcast.ts`:
  - **Header `List-Unsubscribe` + `List-Unsubscribe-Post`** (F-N6).
  - **Batas `BROADCAST_MAX_PER_RUN` (200)** + flag `truncated` (F-N7, anti-timeout).
  - `buildBroadcastText` dipisah; **`sendTestBroadcast`** untuk email uji (F-N5).

### API
- `src/app/api/admin/broadcast/route.ts`:
  - `GET ?list=1` (daftar), `?history=1` (riwayat), default (overview + segmen lengkap).
  - `POST` mendukung `action:"test"` (kirim uji) & `action:"send"`; validasi via
    `validateBroadcast` murni; menyimpan riwayat + audit `broadcast.send`.
- `src/lib/admin-broadcast-api.ts` — overview, daftar, riwayat, kirim/uji, ekspor CSV.

### UI
- `src/components/admin/broadcast-manager.tsx` — kartu ringkasan + **tab**
  (Kirim / Pelanggan / Riwayat).
- **Baru:** `components/admin/broadcast/broadcast-composer.tsx` — form + estimasi
  penerima + **pratinjau** + **kirim uji** + konfirmasi kirim.
- **Baru:** `components/admin/broadcast/subscribers-panel.tsx` — daftar pelanggan
  (cari, filter status, **ekspor CSV**).
- **Baru:** `components/admin/broadcast/broadcast-history.tsx` — riwayat kampanye.

### Audit & rules
- `admin-audit-types.ts` — aksi baru **`broadcast.send`** (bukan lagi `settings.update`).
- `api-schemas.ts` — `broadcastSchema` (tak terpakai) dihapus; validasi pindah ke pure.
- `firestore.rules` — komentar koleksi `broadcasts`.
- **Test:** `scripts/newsletter-pure.test.ts` (11) + script `test:newsletter`.

## 2. Hasil

- `npx tsc --noEmit` bersih ✅
- `npx eslint . --max-warnings=0` bersih ✅
- Semua `test:*` hijau ✅ (**365** test; `test:newsletter` = 11)
- `npm run build` sukses ✅

**Langkah manual:** publish ulang Firestore Rules (koleksi `broadcasts`) —
catch-all sudah menolak klien, publish ulang tetap disarankan. Uji browser:
daftar pelanggan, pratinjau, kirim uji, kirim broadcast, riwayat.

**Catatan (belum):** pengiriman masih sekuensial per-batch (maks 200/pemanggilan);
untuk audiens sangat besar diperlukan antrean/worker terpisah (di luar lingkup).
