# Halaman Tentang Kami (`/tentang`)

Tanggal: 2026-10-14

## Tujuan

Menambah halaman publik "Tentang Kami" agar pengunjung mengenal LKTech —
cerita, misi, visi, dan nilai — sekaligus memperkuat sinyal kepercayaan
(E-E-A-T) dan SEO (entitas Organisasi).

## Cakupan

- Rute baru `/tentang` (server component, ISR `revalidate = 3600`).
- Konten statis di `src/lib/content.ts` (`ABOUT`): `story`, `mission`,
  `vision`, `values`.
- Section: hero, cerita + misi/visi, nilai (kartu ikon), teknologi (marquee
  terkelola), statistik (tersembunyi bila masih default), CTA (`CtaContact`).
- Metadata (title/description/canonical/OG) + JSON-LD `AboutPage` + breadcrumb.
- Integrasi: `NAV_LINKS` + `PAGE_NAV_LINKS` (navbar & footer), `sitemap.ts`,
  smoke E2E `e2e/public-pages.spec.ts`.

## Keputusan

- **Konten statis (bukan terkelola dashboard).** Mengikuti pola `SERVICES`:
  data di modul hardcoded. Menghindari perluasan skema Firestore + UI admin
  hanya untuk satu halaman. Naikkan ke terkelola hanya bila pemilik perlu
  mengedit sering.
- **Tanpa klaim angka fabrikasi.** Bagian statistik memakai komponen `Stats`
  yang sudah menyembunyikan diri bila datanya masih contoh — menjaga prinsip
  kejujuran data.
- **Tanpa bagian tim berisi nama/foto.** Belum ada data nyata; menampilkan
  profil palsu melanggar prinsip kejujuran. Bisa ditambah saat data tersedia.

## Verifikasi

- `node ./node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false`
- E2E: `npm run test:e2e` (memuat `/tentang`, cek status < 400 + konten).

## Skipsi / kapan ditambah

- Konten dikelola dari dashboard → tambah bila pemilik butuh edit tanpa deploy.
- Bagian tim / testimoni → tambah saat ada data nyata.