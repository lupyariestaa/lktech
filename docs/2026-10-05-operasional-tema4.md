# FASE DETAIL — Operasional & Kualitas Teknis (Tema 4)

> **Status:** ✅ **Selengkapnya selesai (O1–O5)** — sebagian dengan catatan infra (lihat §Catatan).
> **Disusun:** sesi pasca-Ulasan & Rating (`docs/2026-10-05-ulasan-rating-produk.md`).
> **Tema roadmap:** **Tema 4 — Operasional & Kualitas Teknis** (`docs/2026-10-06-roadmap-pengembangan.md`).
> **Prinsip:** server-authoritative, observability, a11y, backward-compatible, dokumentasi fase.

---

## 1. Ringkasan

Meningkatkan **operasional, keandalan, & kualitas teknis**: audit log admin,
rate-limit terdistribusi, validasi env saat startup, CI otomatis, dan
peningkatan visual dashboard.

---

## 2. Fase

### O1 — Audit Log Admin Global ✅
- `admin_audit/{id}` (`admin-audit.ts` server-only + `admin-audit-types.ts` aman-klien).
- Dicatat pada aksi: ubah status/hapus/fulfill/invoice/resend order, simpan/hapus produk,
  simpan/arsip/pulih kupon, blokir/hapus user, ubah pengaturan, moderasi/hapus ulasan.
- API `GET /api/admin/audit` (filter aksi/aktor/q) + halaman **`/admin/audit`** + menu "Audit Log".
- Best-effort (kegagalan audit tak menggagalkan aksi utama).

### O2 — Rate-limit Terdistribusi (Upstash Redis) ✅ (opsional, fail-safe)
- `rate-limit.ts`: `checkRateLimit()` memakai **Upstash REST** bila `UPSTASH_REDIS_REST_URL`/`_TOKEN` diisi; jika tidak → fallback in-memory.
- Dipakai endpoint publik `POST /api/coupons/validate` & `POST /api/products/[slug]/reviews`.
- **Webhook Resend** (`EM-P2`): ditunda (butuh domain terverifikasi).

### O3 — Validasi Env "Fail Loud" ✅
- `env-check.ts`: `logEnvHealth()` dipanggil sekali di `instrumentation.ts` (startup).
- Mencatat env WAJIB yang kosong (error) + opsional yang nonaktif (warn). Tidak crash.

### O4 — CI GitHub Actions ✅
- `.github/workflows/ci.yml`: per push/PR ke `main` → `npm ci` → `tsc` → `lint` → semua unit test → `build`.

### O5 — Peningkatan Visual Dashboard ✅
- **Grafik GARIS** (SVG murni, `line-chart.tsx`) menggantikan grafik batang untuk omzet, jumlah pesanan, & tren lead. Area gradient, titik data, tooltip (hover/sentuh/fokus), a11y (tabel sr-only + roving tabindex).
- **Ringkasan**: KPI hero row diperbarui (kartu lebih besar, aksen gradient, tipografi `tabular-nums`).
- **Analitik**: layout & label diperbarui ("Klik titik…", warna garis omzet/pesanan dibedakan).

### O6 — Agregasi Harian Analitik ⏭️ DITUNDA
- `analytics_daily` (O6/`AN-P3`) ditunda: optimasi skala (P2) yang belum diperlukan pada volume saat ini; risiko perubahan write-path tanpa manfaat nyata. Dicatat sebagai backlog.

---

## 3. Catatan
- Upstash & webhook Resend **butuh akun/domain** (langkah manual pemilik). Kode siap & fail-safe.
- Semua perubahan **backward-compatible**.

## 4. Definition of Done
1. `tsc`/`lint`/`build` bersih; unit test (`test:audit` + suite lama).
2. Audit log tercatat server-side (aktor dari token admin).
3. Rate-limit tetap aman walau Upstash tak dikonfigurasi.
4. A11y grafik garis (tabel sr-only, keyboard).
5. Dokumentasi diperbarui.
