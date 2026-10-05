# FASE DETAIL — Retensi & Engagement (Tema 2)

> **Status:** 🚧 Sedang dikerjakan (R1–R4).
> **Disusun:** sesi pasca-Laporan & CRM Mini.
> **Tema roadmap:** **Tema 2 — Retensi & Engagement** (`docs/2026-10-06-roadmap-pengembangan.md`).
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-05-kupon-diskon.md`, `docs/2026-10-05-portal-akun-pengguna.md`, `docs/2026-10-05-email-transaksional-pembeli.md`, `TASK-SELANJUTNYA.md`.
> **Prinsip:** server-authoritative, observability, a11y, mobile-first, **backward-compatible**, dokumentasi fase.

---

## 1. Ringkasan & Tujuan

Mengubah pembeli sekali menjadi **pelanggan berulang** dan pengunjung menjadi audiens:

1. **Program loyalitas/poin** (R1) — poin dari pembelian & ulasan, tier, tukar poin → kupon.
2. **Email marketing ringan** (R2) — newsletter opt-in + broadcast promo dari admin + unsubscribe patuh.
3. **Alert wishlist** (R3) — pemberitahuan "harga turun"/"kembali tersedia" via email.
4. **Notifikasi kanal sekunder** (R4) — WhatsApp opsional (fail-safe) + kerangka Web Push.

---

## 2. Keputusan Desain Kunci

### 2.1 Model & aturan poin (murni, teruji)
- **Rasio dasar:** 1 poin per Rp 10.000 belanja (dapat diubah env). Poin dari order **`dibayar`/`selesai`**.
- **Bonus:** ulasan disetujui (+poin), dsb.
- **Tier** (dari total poin terkumpul/sepanjang waktu):
  - Bronze (0+), Silver (≥ 500), Gold (≥ 2000) — benefit (mis. akses promo, prioritas).
- **Ledger poin** (`users/{uid}` subkoleksi `points/{entryId}`): entri `+`/`−` dengan `reason`, `refId`, `atISO` — sumber kebenaran; `points` (saldo) & `pointsLifetime` (tier) di denormalisasi ke profil.
- **Tukar poin → kupon**: buat kupon unik berkode `POIN-<rand>` (nominal Rp sesuai paket tukar) milik user, potong poin (atomik).

### 2.2 Email marketing (R2)
- **Newsletter opt-in**: koleksi `subscribers/{email}` (public form di footer/promo).
- **Broadcast admin**: pilih segmen (semua / pernah beli / belum pernah) → kirim via Resend (batch), log hasil.
- **Unsubscribe** bertoken HMAC (reuse pola `/api/cart/unsubscribe`).

### 2.3 Alert wishlist (R3)
- Cron membandingkan wishlist user dengan produk: "harga turun" (`originalPrice > price`) & "kembali tersedia" (`soldOut` → false / `stock` naik).
- Email ke pemilik wishlist; cooldown agar tidak spam.

### 2.4 Notifikasi kanal sekunder (R4)
- **WhatsApp Cloud API**: abstraksi `notifyWhatsApp()` — **fail-safe** (nonaktif bila env kosong).
- **Web Push**: kerangka (manifest sudah ada?) — ditunda bila butuh SW kompleks.

---

## 3. Arsitektur Teknis

### 3.1 File/modul baru (rencana)
| File | Peran |
| --- | --- |
| `src/lib/loyalty-pure.ts` | Aturan poin & tier (murni, teruji). |
| `src/lib/loyalty.ts` | Data layer: ledger, saldo, tukar poin, redeem. |
| `src/lib/loyalty-api.ts` | Klien: saldo & riwayat & tukar. |
| `src/app/api/user/points/route.ts` | GET saldo/riwayat, POST tukar poin. |
| `src/components/auth/account-points.tsx` | Tab "Poin" di `/akun`. |
| `src/lib/newsletter.ts` + `src/app/api/newsletter/route.ts` | Opt-in + broadcast + unsubscribe. |
| `src/components/admin/broadcast-manager.tsx` | UI kirim broadcast. |
| `src/lib/wishlist-alert.ts` + `src/app/api/cron/wishlist-alerts/route.ts` | Alert harga/stok. |
| `src/lib/whatsapp-notify.ts` | (R4) abstraksi WA opsional. |

### 3.2 Perubahan file
- `src/lib/user-types.ts` — `points`, `pointsLifetime`, `tier` (opsional, backward-compat).
- `src/lib/user-profile.ts` — normalisasi field poin.
- `src/app/api/orders/route.ts` / webhook — beri poin saat order dibayar/lunas.
- `src/app/admin/(dashboard)/...` — menu broadcast.
- `firestore.rules` — catat koleksi baru (`subscribers`, subkoleksi `points`).

---

## 4. Fase Eksekusi

### FASE R1 — Program Loyalitas/Poin ✅/🚧
- `loyalty-pure.ts` (aturan poin/tier) + test.
- `loyalty.ts` (ledger, saldo, tukar → kupon).
- API `/api/user/points` + tab **Poin** di `/akun`.
- Poin otomatis saat order lunas.

### FASE R2 — Email marketing & newsletter
- Opt-in publik + verifikasi/no-verify, `subscribers`.
- Broadcast admin (segmentasi) + unsubscribe bertoken + log.

### FASE R3 — Alert wishlist
- Cron `/api/cron/wishlist-alerts` + email alert (cooldown).

### FASE R4 — Notifikasi kanal sekunder (fail-safe)
- `notifyWhatsApp()` opsional (env kosong = nonaktif). Web Push ditunda.

### FASE R5 — QA & dokumentasi
- `tsc`/`lint`/`build` bersih; unit test aturan poin/tier/segmentasi.
- Update `TASK-SELANJUTNYA.md`, `docs/README.md`, roadmap.

---

## 5. Risiko & Mitigasi
| Risiko | Mitigasi |
| --- | --- |
| Poin ganda | Ledger idempoten per `refId` (orderId); atomik via transaksi |
| Abuse tukar poin | Validasi saldo server + rate-limit + kupon unik |
| Spam broadcast | Opt-out dihormati + segmentasi + batas |
| Infra WA kosong | Fail-safe (nonaktif, tidak error) |
| Data lama | Field poin opsional; lead/user lama tetap valid |

---

## 6. Definition of Done
1. `tsc`/`lint`/`build` bersih; unit test aturan poin/tier.
2. Poin & tukar divalidasi server (saldo, idempotensi).
3. Newsletter opt-in + unsubscribe patuh; broadcast berlog.
4. A11y & mobile-first (tab Poin, form newsletter).
5. Dokumentasi fase diperbarui.
