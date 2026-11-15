# Audit QA — Dashboard Ruang LKTech Tools

**Tanggal:** 2026-11-15
**Cakupan:** implementasi dashboard pada `50fdc67` (`feat(tools): upgrade workspace dashboard`)
**Mode:** audit dan tindak lanjut perbaikan.
**Status:** kelima gap telah ditangani; unit/wiring regression suites, TypeScript, build production Webpack, lint, dan seluruh 14 E2E Auth Emulator lolos.

## Ringkasan

Dashboard punya fondasi yang baik: route workspace diberi `noindex`, data preferensi dibatasi ke slug/statistik lokal, drawer memiliki dialog/focus trap/Escape, dan cakupan tes logika cukup luas. Namun, ada beberapa celah pada ketahanan penyimpanan, konsistensi analytics, umpan balik kegagalan autentikasi, semantik aksesibilitas drawer, dan cakupan tes end-to-end.

## Temuan terverifikasi

### QA-TOOLS-01 — Penghitungan pemakaian tidak konsisten jika `localStorage` gagal

- **Severity:** P2 — fungsionalitas degradasi pada private mode/kebijakan browser/storage penuh.
- **Area:** penyimpanan lokal, fallback.
- **Bukti:** `src/lib/tools-storage.ts:41-57` menelan kegagalan baca/tulis. `recordToolOpen()` pada `:172-183` membaca kembali melalui `readRecentTools()`/`readToolUsage()` (membaca storage, bukan cache in-memory), lalu menulis hasil. Bila storage terus gagal, setiap kunjungan menghitung dari data kosong; hitungan/riwayat tidak terakumulasi secara andal walau komentar `safeWrite` menyebut cache in-memory tetap berjalan.
- **Dampak:** kartu statistik/frekuensi dapat tetap nol atau hanya mencerminkan kunjungan terakhir di browser yang menolak storage; UI tidak menjelaskan bahwa preferensi tidak tersimpan.
- **Tindak lanjut:** tentukan perilaku fallback secara eksplisit (cache in-memory dipakai pada read-modify-write atau tampilkan status storage tidak tersedia); tambahkan tes dengan `getItem`/`setItem` yang melempar.

### QA-TOOLS-02 — Satu pembukaan tool berpotensi dihitung dua kali pada event analytics

- **Severity:** P2 — kualitas data produk/analitik.
- **Area:** analytics.
- **Bukti:** klik navigasi mencatat `tools_tool_open` dari `src/components/tools/dashboard/tools-sidebar.tsx`/`tools-favorite-list.tsx`/`tools-frequent-list.tsx`/`tools-shortcuts.tsx` atau katalog (`src/components/tools/tool-card.tsx` dan `src/components/tools/tools-catalog.tsx`); setelah workspace termuat, `src/components/tools/tool-workspace.tsx:40-45` juga mengirim `tools_tool_open` dengan `source: "workspace"`. Dashboard/shortcut mengirimnya di `src/components/tools/dashboard/tools-dashboard-overview.tsx:137-145, 152-184`.
- **Dampak:** bila `tools_tool_open` dimaksudkan menghitung jumlah pembukaan, satu aksi navigasi dapat menghasilkan event klik dan event mount. Deep link/refresh hanya menghasilkan event mount, sehingga angka tidak sebanding antar-sumber. Event click dan mount mungkin sama-sama berguna, tetapi definisi metrik/dedup belum tampak.
- **Tindak lanjut:** dokumentasikan apakah metrik berarti intent klik atau workspace berhasil dibuka; pisahkan nama event atau deduplikasi berdasarkan definisi itu. Tambahkan tes analytics per jalur (katalog, sidebar, recent, related, direct load/refresh).

### QA-TOOLS-03 — Kegagalan logout ditelan tanpa pesan untuk pengguna

- **Severity:** P2 — umpan balik/status autentikasi.
- **Area:** UX, aksesibilitas.
- **Bukti:** `src/components/tools/dashboard/tools-sidebar-footer.tsx:37-46`; `catch` hanya mengembalikan `signingOut` ke `false`. State `notice` pada file itu dipakai untuk penghapusan data, bukan kegagalan logout.
- **Dampak:** pengguna dapat menekan keluar, tetap berada di dashboard, dan tidak tahu logout gagal atau perlu dicoba ulang.
- **Tindak lanjut:** tampilkan pesan kegagalan yang dapat dibaca screen reader (`role="status"`/alert sesuai urgensi) dan pastikan tombol kembali aktif; uji kegagalan `signOutUser()`.

### QA-TOOLS-04 — `aria-controls` hamburger menunjuk elemen yang tidak ada saat drawer tertutup

- **Severity:** P3 — semantik aksesibilitas.
- **Area:** aksesibilitas mobile.
- **Bukti:** `src/components/tools/dashboard/tools-mobile-topbar.tsx:18-24` selalu memasang `aria-controls="tools-drawer"`, sementara `src/components/tools/dashboard/tools-mobile-drawer.tsx:48` mengembalikan `null` ketika drawer tertutup. Elemen `id="tools-drawer"` baru dirender saat terbuka (`:59-65`).
- **Dampak:** ketika tertutup, relasi kontrol ARIA merujuk ID yang tidak ada; dukungan pengumuman/eksposur relasi ini dapat bervariasi antar kombinasi browser dan screen reader.
- **Tindak lanjut:** pertimbangkan menjaga panel/target ID tetap ada dengan hidden/inert yang tepat, atau hanya mengumumkan relasi saat target tersedia. Verifikasi dengan axe dan screen reader nyata setelah perubahan.

### QA-TOOLS-05 — Tidak ada cakupan E2E untuk alur dashboard terautentikasi

- **Severity:** P2 — risiko regresi.
- **Area:** test coverage.
- **Bukti:** pencarian E2E menemukan dashboard hanya disentuh oleh assertion `noindex` pada `e2e/public-pages.spec.ts:93-94`. Belum ditemukan E2E untuk login/guard yang mengizinkan dashboard, navigasi workspace, filter URL/back-forward, drawer, favorit/riwayat, hapus data, atau logout.
- **Dampak:** interaksi yang bergantung pada auth, browser history, localStorage, dan viewport mobile tidak terlindungi oleh regression suite otomatis.
- **Tindak lanjut:** tambahkan suite dashboard terautentikasi (mock/emulator atau fixture auth aman) untuk jalur utama desktop/mobile dan persistence; pertahankan satu tes guard/noindex anonim.

## Risiko/hipotesis untuk validasi browser

Temuan di bawah bukan klaim bug terkonfirmasi; perlu pengujian pada browser/perangkat nyata sebelum diprioritaskan sebagai defect.

| ID | Prioritas awal | Skenario yang perlu diverifikasi | Bukti/area kode | Tindak lanjut validasi |
| --- | --- | --- | --- | --- |
| QA-TOOLS-M01 | P2 | Saat drawer mobile terbuka, tombol Back browser/Android menavigasi halaman alih-alih menutup drawer terlebih dahulu. | Drawer dikelola state lokal di `src/components/tools/dashboard/tools-shell.tsx:30-50`; tidak tampak integrasi history/popstate. | Uji Android Chrome/iOS Safari dan keyboard browser; putuskan apakah drawer harus menjadi history entry atau cukup ditutup lewat Escape/tap backdrop. |
| QA-TOOLS-M02 | P2 | Dua tab mengubah favorit/usage hampir bersamaan; pola read-modify-write dapat menimpa pembaruan tab lain. | `src/lib/tools-storage.ts:121-140, 172-185`; event storage menyegarkan snapshot, tetapi tidak menggabungkan operasi yang bersaing. | Uji dua tab dengan aksi serentak; terima risiko last-write-wins atau rancang merge/penyimpanan yang lebih atomik sesuai kebutuhan produk. |
| QA-TOOLS-M03 | P2 | Pengalaman guard dan logout pada akun nyata, termasuk error Firebase/offline serta tujuan redirect `next`. | `src/app/tools/(workspace)/layout.tsx:17-24`; logout di `tools-sidebar-footer.tsx`; pemeriksaan visual sebelumnya menggunakan guard bypass dan belum menjalankan login akun nyata. | Smoke test dengan akun non-produksi dan kondisi offline/error; jangan gunakan atau simpan kredensial dalam tes. |
| QA-TOOLS-M04 | P2 | Ukuran target sentuh, zoom/reflow, kontras, reduced motion, dan screen-reader announcement pada semua state katalog/dashboard, bukan sidebar saja. | Komponen terkait `src/components/tools/dashboard/`, `src/components/tools/tools-catalog.tsx`, dan `src/components/tools/tool-card.tsx`. | Jalankan audit axe/manual pada 320–360 px, zoom 200–400%, keyboard, VoiceOver/NVDA, kontras, serta `prefers-reduced-motion`; catat pasangan browser/AT. |
| QA-TOOLS-M05 | P2 | Back/forward mengembalikan query/filter katalog dengan benar setelah debounce dan navigasi internal. | Sinkronisasi state dan URL ada di `src/components/tools/tools-catalog.tsx:69-92`; ada `popstate` listener dan `router.replace`. | Uji pengetikan cepat, clear filter, refresh URL shareable, Back/Forward; pastikan state kontrol dan hasil selalu sama dengan URL. |

## Hal yang sudah tampak ditangani (bukan gap dalam audit ini)

- Layout workspace menetapkan `robots: { index: false, follow: false }` di `src/app/tools/(workspace)/layout.tsx:13-15`; pengujian anonim terkait sudah ada di `e2e/public-pages.spec.ts`.
- Store menyimpan slug, hitungan, dan waktu; komentar/bentuk payload di `src/lib/tools-storage.ts` dan `src/lib/tools-usage-pure.ts` menyatakan tidak menyimpan isi berkas atau teks pengguna.
- Drawer mengimplementasikan dialog modal, Escape, trap fokus dan pemulihan fokus melalui `src/components/tools/dashboard/tools-mobile-drawer.tsx` serta `src/components/admin/use-drawer-focus.ts`; verifikasi sebelumnya melaporkan fokus/ESC dan penghapusan data lokal lolos secara manual.
- QA visual sebelumnya pada lebar 360/390/768/1024/1440 melaporkan tidak ada overflow horizontal. Ini bukan pengganti pengujian reflow/zoom/accessibility di atas.

## Hasil perbaikan dan validasi

- **QA-TOOLS-01:** `recordToolOpen()` kini memakai snapshot/cache in-memory pada read-modify-write. `ToolsShell` mengumumkan bila browser storage tidak tersedia dan menyatakan preferensi hanya bertahan di tab saat ini.
- **QA-TOOLS-02:** intent klik dicatat sebagai `tools_tool_open_intent`; `tools_tool_open` hanya dikirim ketika workspace mount. Related tools hanya mencatat intent saat link diklik.
- **QA-TOOLS-03:** kegagalan logout ditampilkan sebagai alert yang terhubung melalui `aria-describedby`, sementara tombol kembali aktif.
- **QA-TOOLS-04:** `aria-controls` hamburger hanya dipasang jika drawer ter-mount. Regression E2E menguji relasi saat buka/tutup, Escape, dan pemulihan fokus.
- **QA-TOOLS-05:** `e2e/auth/tools-dashboard.spec.ts` menambahkan skenario mobile melalui Google Auth Emulator UI, tanpa bypass autentikasi produksi; mencakup guard/noindex, favorit/filter, riwayat workspace, clear, drawer, logout, dan kegagalan storage. Build E2E menggunakan API key/project demo dan emulator loopback saja.
- `npm run test:tools-dashboard`: **5/5 lolos**.
- `npm run test:tools-pages`: **16/16 lolos**.
- Suite `tools-usage`, `tools-discovery`, `tools-registry`, `tools-color`, `tools-image`, `tools-text`, dan `tools-pdf`: semuanya lolos.
- `npx tsc --noEmit`: lolos.
- `npm run lint`: lolos.
- `npm run build`: memakai `next build --webpack` sebab Turbopack di mesin Windows ini salah membaca BOM `package.json` meskipun byte file diawali `{` tanpa BOM; build production Webpack sukses untuk 217 halaman/route.
- `npm run test:e2e:auth`: **14/14 lolos**, memakai UI Google Auth Emulator dan fixture lokal demo. Meliputi login guard/noindex, favorit/filter/riwayat/clear, drawer ARIA + Escape/fokus, logout, dan kegagalan storage.
- Output E2E mengeluarkan peringatan non-blocking 404 untuk Vercel Insights serta `NoFallbackError` ketika menavigasi dari workspace ke ruang; seluruh assertion tetap lolos dan bukan bagian dari lima gap dashboard yang diaudit.

## Urutan validasi lanjutan

1. Jalankan sesi manual untuk risiko M01–M05; promosikan menjadi temuan hanya bila berhasil direproduksi.
