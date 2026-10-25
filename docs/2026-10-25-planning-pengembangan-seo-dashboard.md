# Planning Pengembangan Sistem SEO & Dashboard LKTech

> **Status:** D1–D6 tervalidasi dan sudah di-push; siap lanjut D7 (rilis, observability, evaluasi)
> **Disusun:** 25 Oktober 2026  
> **Cakupan:** audit kondisi repo saat ini dan rencana pengembangan bertahap untuk SEO teknis, pengukuran, dan pengalaman dashboard admin.  
> **Dokumen fondasi:** `docs/2026-10-12-seo-konten-mesin.md` mencatat pengerjaan fondasi SEO S0–S7. Dokumen ini melanjutkan fondasi tersebut, bukan menyatakan seluruh rekomendasi baru sudah dikerjakan.
> **Keputusan pemilik produk:** delapan keputusan awal telah dijawab; lihat §10.1. Rencana dan urutan fase di bawah sudah diperbarui untuk memasukkannya.

---

## 1. Ringkasan eksekutif

LKTech telah memiliki fondasi teknis SEO yang cukup luas: metadata per halaman, canonical, Open Graph, JSON-LD, sitemap, robots, RSS, halaman blog, halaman layanan per kota yang dikurasi, Google Search Console (GSC), GA4 opsional, Google Analytics/Vercel Analytics, dan pengaturan SEO di dashboard.

Dashboard `/admin/seo` saat ini masih berupa **laporan GSC minimum**: pilihan 7/28/90 hari, empat angka ringkas, query teratas, halaman teratas, dan tombol muat ulang. Fondasi ini berguna sebagai koneksi, tetapi belum menjadi alat pengambilan keputusan SEO. Ada pula risiko interpretasi data: angka Klik dan Impresi dashboard dihitung dari baris query teratas yang dibatasi, bukan agregat keseluruhan properti; kegagalan API dapat terlihat seperti laporan kosong karena hasil query gagal dinormalisasi menjadi array kosong.

Rekomendasi utama: kembangkan secara bertahap, dimulai dengan **ketepatan dan kejelasan data**, lalu diagnosis peluang GSC, validasi SEO teknis, dan workflow editorial. Jangan memulai dengan skor SEO buatan, klaim peringkat, atau otomasi yang mengubah konten/metadata tanpa persetujuan manusia.

### Urutan prioritas yang disarankan

1. **P0 — Kepercayaan data:** pisahkan agregat total dari tabel top-N; bedakan kosong, belum terkonfigurasi, dan gagal; perbaiki loading/periode serta dokumentasi.
2. **P1 — Analisis GSC proper:** tren dan pembanding periode, tabel query/halaman yang dapat diurutkan, filter negara/perangkat/jenis pencarian, dan CSV dengan batas aman.
3. **P2 — Kesehatan SEO teknis:** ringkasan canonical/indexability/sitemap/metadata/structured data dengan status yang dapat diverifikasi, bukan skor tanpa bukti.
4. **P3 — Operasional konten:** hub artikel dan halaman yang perlu diperbarui, internal links, editorial checklist, rekomendasi tindakan yang dapat ditinjau.
5. **P4 — Integrasi tambahan:** GA4, Core Web Vitals/Speed Insights, sinkronisasi atau laporan terjadwal hanya setelah akses, privasi, biaya, serta kebutuhan operasional disepakati.

---

## 2. Kondisi saat ini (hasil inspeksi repo)

### 2.1 SEO publik

- `src/app/layout.tsx` membentuk metadata default melalui `getSiteSettings()` dan `resolveSeo()`. Metadata mencakup title/description, OG, Twitter, `metadataBase`, verification Google bila diisi, dan robots default.
- Halaman publik mengatur metadata secara individual; halaman detail blog, produk, portofolio, layanan, dan layanan-per-kota memiliki metadata dinamis.
- `src/app/sitemap.ts` menyusun sitemap dari halaman statis, layanan, kota, proyek, artikel, produk, kategori, dan tag. `lastModified` untuk rute statis memakai tanggal stabil, sedangkan artikel/proyek memakai tanggal kontennya bila tersedia. Revalidasi sitemap satu jam.
- `src/app/robots.ts` mengizinkan halaman publik, mengecualikan admin/API/akun/keranjang/masuk/unduhan/offline, dan menunjuk sitemap.
- Structured data telah dipakai pada sejumlah halaman (termasuk organisasi/layanan/produk/artikel/breadcrumb/FAQ/item list sesuai cakupan dokumen fondasi). Coverage per rute tetap perlu audit ulang ketika halaman baru ditambahkan.
- Ada hub kategori/tag blog, RSS, internal link blog-layanan/portofolio, dan programmatic SEO layanan × kota terkurasi.
- Pengaturan `settings-seo.tsx` menyimpan meta title, description, OG image, dan Google verification. Antarmuka menyebut judul ≤60 dan deskripsi ≤160, tetapi input menerima masing-masing sampai 160/320 karakter. Ini perlu diselaraskan; batas rekomendasi snippet bukan batas keras Google.

### 2.2 Dashboard SEO dan GSC

- Halaman tersedia di `src/app/admin/(dashboard)/seo/page.tsx` dengan komponen `src/components/admin/seo-dashboard.tsx`.
- Dashboard hanya menyediakan rentang 7, 28, dan 90 hari, refresh manual, ringkasan Klik/Impresi/CTR/Jumlah halaman teratas, serta tabel query dan halaman teratas.
- API `src/app/api/admin/seo/route.ts` memanggil `requireAdmin`, membatasi rentang lewat `clampDays`, dan mengembalikan `Cache-Control: no-store`.
- `src/lib/search-console.ts` membuat JWT service account dengan scope read-only dan memanggil Search Analytics API. Env yang dipakai: `GSC_SERVICE_ACCOUNT` dan `GSC_SITE_URL`.
- `src/lib/search-console-pure.ts` memiliki parsing service account, pembentukan rentang/body query, normalisasi baris, dan ringkasan agregat.
- `src/lib/admin-settings-api.ts` menyediakan tipe dan client fetch untuk laporan.
- Error OAuth/query ditangani fail-safe, tetapi kegagalan query dikembalikan sebagai `null`, lalu diubah menjadi array kosong. Respons tetap `configured: true`; UI berpotensi menampilkan "belum ada data" walaupun API sebenarnya gagal.
- Dua permintaan laporan (query dan halaman) saat ini memanggil `getAccessToken()` secara paralel, sehingga satu refresh dapat membuat dua pertukaran token.
- Ringkasan angka saat ini dihitung dari `topQueries` (top 25). Ini bukan agregat semua query properti; tail query tidak tercakup. CTR dari total klik/impresi yang sama juga menjadi rasio top-N, bukan metrik properti menyeluruh.
- Range query berakhir kemarin sesuai helper pure, sementara data GSC dapat tertinggal beberapa hari. UI menyampaikan jeda 2–3 hari, tetapi batas tanggal default belum otomatis mengecualikan 2–3 hari penuh.
- Link setup pada empty state merujuk dokumen setup Mayar, bukan panduan konfigurasi GSC. Tidak ada tampilan status koneksi rinci atau `last updated` selain rentang tanggal laporan.

### 2.3 Pengukuran terkait

- Google Analytics (`GoogleAnalytics`) ada pada root layout dan GA4 disebut opsional dalam dokumen fondasi. Tidak ditemukan dashboard GA4 dalam scope halaman SEO yang diperiksa.
- Vercel Analytics sudah dipakai; Vercel Speed Insights baru ditambahkan ke root layout pada commit `7c257ea`. Metrik Speed Insights adalah sinyal performa pengalaman pengguna, bukan pengganti laporan indeksasi/ranking GSC.
- Data Analytics dan GSC berada di sistem/sumber berbeda. Jangan menjumlah atau membandingkannya seakan memiliki definisi atribusi/periode yang sama.

### 2.4 Tes yang sudah ada

- `scripts/search-console.test.ts` menguji fungsi pure Search Console.
- `scripts/seo-pure.test.ts`, `scripts/seo-schema.test.ts`, dan `scripts/article-seo.test.ts` menguji sebagian logika SEO/structured data/artikel.
- Perlu menambahkan tes untuk perilaku endpoint/UI: status integrasi, error versus data kosong, agregasi global versus top-N, filter, dan batas rentang.

**Catatan kemajuan D1 (25 Oktober 2026):** implementasi menambahkan status laporan eksplisit, aggregate query terpisah dari top-N, satu access token per laporan, timeout dan kode error aman, validasi bentuk respons, empty/error/partial state, pencegahan response lama menimpa filter terbaru, serta pengecualian tiga hari terakhir pada preset GSC. Tes GSC awal (13), seluruh unit test saat itu (682), ESLint, TypeScript, dan `git diff --check` lulus. Build awal melewati timeout shell setelah 120/161 halaman, tetapi setelah build diulang pada verifikasi D2, production build selesai dengan 162/162 halaman statis; D1 dinyatakan tervalidasi.

**Catatan kemajuan D2 (25 Oktober 2026):** implementasi lokal mencakup tanggal kustom tervalidasi (inklusif, maksimum 180 hari, jeda data tiga hari), pembanding periode setara, tren harian, filter negara/perangkat/jenis pencarian/query/URL, tabel sort/pagination, serta CSV formula-safe yang dibatasi pada 100 baris teratas yang diminta API. Tes khusus GSC (17), seluruh unit test (686), ESLint berkas terkait, TypeScript, `git diff --check`, dan production build (162/162 halaman statis) lulus. Di-commit sebagai `f1fe5f9` dan di-push ke `origin/main`. Penutup celah D2: grafik tren harian kini menampilkan klik dan impresi sebagai dua grafik terpisah (skala tidak menyesatkan).

**Catatan kemajuan D3 (25 Oktober 2026):** implementasi lokal menambahkan `src/lib/seo-insights-pure.ts` (empat aturan heuristik: klik menurun vs periode pembanding, impresi tanpa klik, CTR rendah relatif terhadap rata-rata berbobot impresi himpunan, posisi dekat halaman pertama). Setiap insight menyertakan metrik sumber, aturan pemicu, ambang yang dipakai, keterbatasan, satu tindakan manual, serta rentang tanggal — tanpa skor black-box dan tanpa klaim sebab-akibat. Ambang tampil di UI dan impresi minimum dapat disesuaikan admin (`minImpressions`, divalidasi server 0–100.000). Tautan halaman hanya untuk URL same-origin tervalidasi (`sameOriginUrl`). Tindak lanjut editorial (`review_title`/`update_content`/`ignore`, alasan opsional) dicatat melalui `PATCH /api/admin/seo` ke audit log non-PII (aksi baru `seo.insight_action`, rate-limited, tanpa perubahan konten otomatis). Laporan kini juga mengambil breakdown periode pembanding per query/halaman; bila gagal, aturan penurunan dilewati dan dilaporkan lewat `unavailableSections: ["declines"]`. Tes baru `scripts/seo-insights.test.ts` (13) dan seluruh unit test (699), ESLint, TypeScript, serta `git diff --check` lulus. Di-commit sebagai `c283180` (`feat: add rule-based SEO insights`) dan di-push ke `origin/main`; sekaligus menutup celah D2 dengan memisahkan grafik tren harian klik & impresi.

**Catatan kemajuan D4 (25 Oktober 2026):** implementasi lokal menambahkan audit SEO teknis berbasis inventaris URL. Inventaris dibangun dari sumber yang sudah ada (`src/lib/seo-inventory.ts`: sitemap statis, layanan, layanan × kota, portofolio, artikel, produk, kategori/tag) — tanpa sumber data baru. Modul murni `src/lib/seo-audit-pure.ts` memuat guard SSRF (`isSameOriginAllowed`, `normalizeAuditPath`), parsing HTML bounded (title, description, meta robots, canonical, Open Graph, JSON-LD), aturan per halaman, agregasi, dan pengurutan berdasar dampak. Crawler internal `src/lib/seo-crawler.ts` berjalan **on-demand** dengan batas tegas: same-origin allowlist untuk SETIAP hop termasuk redirect (redirect ke host lain tidak diikuti, hanya dilaporkan sebagai `redirect_external`), timeout per permintaan, batas ukuran body, maksimum redirect, jumlah URL, dan concurrency. Aturan memeriksa: gagal ambil/HTTP error, redirect, noindex (meta/Hx header), title/description hilang atau panjang di luar rentang (ditandai heuristik), canonical hilang/salah/ lintas-host, Open Graph tidak lengkap, JSON-LD rusak, dan "tidak ada di sitemap". Laporan membedakan **"tidak ada di sitemap"** dari pemeriksaan HTTP dan secara eksplisit TIDAK menyimpulkan status indexing Google. Endpoint `POST /api/admin/seo/audit` (rate-limited, `maxDuration` 60s, aksi audit `seo.audit_run`) menjalankan audit dan menyimpan hasil per run ke `seo_audits` dengan retensi terbatas; `GET` mengembalikan hasil terakhir. UI `src/components/admin/seo-audit-panel.tsx` menampilkan ringkasan, prioritas masalah per kode, dan tabel semua URL, dengan catatan keterbatasan. Tes baru `scripts/seo-audit.test.ts` (19) dan seluruh unit test (718), ESLint, TypeScript, `git diff --check`, dan production build (162/162 halaman statis) lulus. Di-commit sebagai `bca1793` (`feat: add on-demand technical SEO audit`) dan di-push ke `origin/main`.

**Catatan kemajuan D5 (25 Oktober 2026):** implementasi lokal menambahkan workflow pengaturan dan konten SEO. Modul murni `src/lib/seo-workflow-pure.ts` memusatkan panduan panjang sebagai satu sumber kebenaran (`SNIPPET_GUIDE`: judul 30–60, deskripsi 70–160 karakter) — ditegaskan sebagai HEURISTIK tampilan, bukan batas pasti Google. Preview snippet gaya hasil pencarian (`buildSnippetPreview`, `analyzeSnippet`) memakai judul/deskripsi hasil **resolusi** (meta bila ada, fallback judul/ringkasan) sehingga mencerminkan aturan metadata yang benar-benar dipakai aplikasi, dan menampilkan status panjang sebagai panduan (bukan error). Validasi gambar Open Graph bersifat statis tanpa memuat gambar (`validateOgImageUrl`): bentuk URL diperiksa, ekstensi dikenal/diperkirakan. Checklist pra-terbit (`buildSeoChecklist`) mencakup judul/deskripsi ada & panjang, keunikan judul/slug, kebersihan slug, indexability, canonical, gambar & alt, tautan internal, dan structured data per jenis konten — **tidak memblokir publish** (`SEO_CHECKLIST_BLOCKING_ENABLED = false`), tanpa perubahan konten otomatis. Komponen `src/components/admin/seo-preview.tsx` (`SeoSnippetPreview`, `OgPreview`, `SeoChecklistPanel`) memakai `useSyncExternalStore` untuk host agar aman dari hydration mismatch; diintegrasikan ke editor artikel (`articles-manager.tsx`: preview snippet/OG, checklist, deteksi duplikat judul/slug dari daftar konten) dan Settings SEO (`settings-seo.tsx`: label batas selaras `settingsSchema` — title 160, description 320, ogImage 500, searchConsoleId 120 — plus preview snippet/OG default). Tes baru `scripts/seo-workflow.test.ts` (11) dan seluruh unit test (729), ESLint berkas terkait, TypeScript, `git diff --check`, dan production build (162/162 halaman statis) lulus. Di-commit sebagai `5571597` (`feat: add SEO content workflow previews`) dan di-push ke `origin/main`.

**Catatan kemajuan D6 (25 Oktober 2026):** implementasi lokal menambahkan integrasi **Google Analytics 4** sebagai sumber **TERPISAH** dari Search Console (tidak ada endpoint gabungan; angka GA4 tidak dicampur dengan GSC). Keputusan produk yang diputuskan: metrik **keterlibatan + konversi kunci** — server-side GA4 Data API read-only, properti eksplisit, dan maksimum **3 event konversi** dipilih admin. Modul murni `src/lib/ga4-pure.ts` memuat validasi ID properti (`normalizePropertyId` — menerima ID numerik, menolak `G-XXXXXXX`), resolusi rentang (`resolveGa4Range`, jeda 1 hari, maks 180 hari), pembangun body `runReport` (metrik/dimensi/filter `eventName` `inListFilter`, batas baris), normalisasi respons (`normalizeGa4Rows`, `normalizeGa4Summary`, `isValidGa4Response`), kode error aman (`ga4ErrorCode`), status laporan (`ga4Status`), parsing event konversi (`parseConversionEvents`), dan **redaksi rahasia** (`redactSecrets`) untuk log. Server `src/lib/ga4.ts` memakai kredensial terpisah (`GA4_SERVICE_ACCOUNT`, `GA4_PROPERTY_ID`, `GA4_CONVERSION_EVENTS`), scope `analytics.readonly`, JWT RS256 tanpa dependensi baru, timeout, dan pemetaan kuota. Endpoint **khusus** `GET /api/admin/seo/ga4` (admin guard, `no-store`, whitelist parameter) mengembalikan `status`/`errorCode` + ringkasan, tren harian, halaman teratas, dan konversi. UI `src/components/admin/ga4-panel.tsx` menampilkan panel berlabel sumber GA4 (tampilan halaman/sesi/pengguna/rasio keterlibatan, tren, tabel halaman dengan CSV aman, event konversi, dan catatan keterbatasan: sampling/thresholding, jeda pemrosesan, tidak menyimpulkan peringkat, tidak sebanding langsung dengan GSC), plus tautan terpisah ke Speed Insights Vercel/CWV. Halaman `/admin/seo` disusun ulang agar tiap sumber punya judulnya sendiri (Search Console, audit teknis, GA4). Tes baru `scripts/ga4.test.ts` (14) dan seluruh unit test (743), ESLint berkas terkait, TypeScript, `git diff --check`, dan production build (162/162 halaman statis) lulus. Keputusan/privacy/biaya/batas API terdokumentasi di §10.3. Di-commit sebagai `421e071` (`feat: add Google Analytics 4 engagement dashboard`) dan di-push ke `origin/main`.

---

## 3. Sasaran produk

Dashboard SEO idealnya membantu admin menjawab pertanyaan berikut tanpa harus menafsirkan data yang ambigu:

1. Apakah sumber data aktif dan kapan data terakhir berhasil diperbarui?
2. Bagaimana klik, impresi, CTR, dan posisi berubah dibanding periode sebelumnya?
3. Query dan landing page mana yang paling berkontribusi, tumbuh, atau menurun?
4. Query mana yang banyak mendapat impresi tetapi CTR rendah, atau berada dekat halaman pertama?
5. Bagaimana performa berbeda menurut perangkat, negara, dan jenis pencarian?
6. Halaman penting mana yang belum ditemukan, belum diindeks, memiliki metadata/canonical bermasalah, atau tidak tercantum di sitemap?
7. Tindakan apa yang layak dilakukan, bukti apa yang mendukungnya, dan bagaimana hasilnya diukur?

### Bukan sasaran

- Menjanjikan kenaikan ranking atau traffic.
- Mengganti Google Search Console/GA4 atau menjadi crawler web penuh.
- Membuat skor SEO tunggal yang tidak transparan dan tidak dapat diaudit.
- Mengubah metadata, menerbitkan artikel, menghapus URL, atau mengirim permintaan indexing secara otomatis tanpa persetujuan admin.
- Menyimpan atau menampilkan token, private key, raw credential, maupun data rahasia.

---

## 4. Prinsip desain dan implementasi

- **Server-authoritative:** semua credential dan panggilan Google hanya di server; API tetap dilindungi `requireAdmin`.
- **Kebenaran lebih penting daripada banyak widget:** angka aggregate harus benar dan definisinya terlihat.
- **Status tidak ambigu:** bedakan `not_configured`, `connected`, `no_data`, `partial`, dan `error`.
- **Sumber dan periode selalu terlihat:** tampilkan nama sumber, properti terpilih (tanpa rahasia), zona waktu/periode yang relevan, jeda data, serta waktu sinkronisasi.
- **Batas API dihormati:** batasi row limit, validasi filter/rentang, hindari request berulang dan sediakan cache server dengan TTL bila aman.
- **Privasi dan least privilege:** scope GSC tetap read-only kecuali ada keputusan eksplisit kelak; jangan logging query sensitif atau credentials.
- **Progressive enhancement:** dashboard tetap berguna saat GSC/GA4 belum terpasang; tampilkan instruksi yang tepat, bukan crash.
- **Tanpa SEO theater:** setiap temuan/rekomendasi harus punya sinyal, bukti, keterbatasan, dan langkah verifikasi.
- **A11y dan responsif:** kontrol filter, grafik, tabel, status loading/error, dan empty states dapat digunakan keyboard/screen reader/mobile.
- **Tidak mengarang target bisnis:** jangan membuat target CTR, posisi, traffic, atau volume konten tanpa persetujuan pemilik.

---

## 5. Rencana fase

### Fase SEO-D0 — Baseline, definisi metrik, dan keputusan

**Tujuan:** menetapkan definisi metrik, sumber data, periode pembanding, dan kontrak dashboard sebelum menambah grafik.

**Pekerjaan**

- Catat baseline perilaku endpoint dan UI yang sekarang; verifikasi status API terhadap konfigurasi env tanpa mengeluarkan secret.
- Tetapkan definisi `clicks`, `impressions`, `CTR = clicks / impressions`, dan posisi rata-rata berbobot impresi.
- Pisahkan dua query dengan sengaja: aggregate seluruh properti (tanpa dimensi) dan top rows berdasarkan query/page.
- Tentukan periode perbandingan: periode sebelumnya dengan panjang sama, serta perlakuan tanggal data GSC yang terlambat.
- Putuskan apakah rentang dashboard mendukung 7/28/90 hari saja atau rentang tanggal kustom; rentang tetap menjadi pilihan awal yang disarankan.
- Tetapkan kontrak status integrasi dan format error publik yang aman (kode/status tanpa isi credential atau raw Google response).

**Kriteria selesai**

- Metrik serta batasan GSC terdokumentasi dan disetujui.
- Ada contoh respons bertipe yang membedakan konfigurasi, data kosong, kegagalan, dan keberhasilan parsial.
- Tidak ada kebutuhan data bisnis/credential baru yang diasumsikan.

### Fase SEO-D1 — Keandalan dan kebenaran data (P0, kerjakan pertama)

**Pekerjaan**

- Ubah respons laporan menjadi model bertipe yang memisahkan `summary` (aggregate) dari `topQueries`/`topPages`.
- Lakukan aggregate query tanpa dimensi untuk summary; jangan menyimpulkan total seluruh properti dari top 25.
- Gunakan satu access token per permintaan laporan dan berbagi token untuk query aggregate + query breakdown.
- Bedakan hasil Google kosong yang sah dari kegagalan token, permission, API disabled, timeout, quota, dan property tidak ditemukan. UI tampilkan state yang sesuai tanpa membocorkan detail berisiko.
- Berikan timeout dan perlindungan terhadap jawaban API malformed; jangan ubah error diam-diam menjadi array kosong.
- Validasi range query pada server dengan allowlist; hindari menerima tanggal arbitrary tanpa batas.
- Perbaiki lifecycle loading: state awal, refresh ketika report lama sudah ada, pergantian range cepat, dan unmount harus mencegah response lama menimpa pilihan terakhir.
- Tampilkan tanggal data yang ditanyakan, jeda data, sumber Search Console, status koneksi, dan waktu pengambilan.
- Ganti rujukan setup Mayar dengan dokumentasi GSC yang benar. Buat checklist singkat untuk service account, GSC API, izin properti, dan env Vercel.
- Uji bahwa hasil API admin tetap no-store atau memakai cache terkontrol di server; jangan menaruh private data pada cache publik.

**Tes**

- Aggregate berbeda dari jumlah top-N ketika terdapat tail data.
- Query berhasil dengan nol baris tidak sama dengan query gagal.
- Invalid JSON/key/API disabled/403/429/5xx/timeout/malformed response menghasilkan status yang tepat.
- Endpoint tetap memerlukan admin; response dan log tidak menyertakan access token/private key.
- Pilihan range terbaru menang atas response lama (race condition).

**Kriteria selesai**

- Kartu metrik utama sama dengan aggregate API, bukan jumlah tabel top-N.
- Status koneksi/data/error terbaca jelas dan dapat diuji.
- Tes Search Console murni serta endpoint lulus; lint/typecheck lulus.

### Fase SEO-D2 — Dashboard GSC untuk tren dan eksplorasi

**Pekerjaan**

- Tambahkan grafik tren harian untuk klik dan impresi; CTR/posisi dapat ditampilkan sebagai grafik terpisah agar skala tidak menyesatkan.
- Tampilkan perbandingan periode sebelumnya dengan delta absolut/persentase; tangani baseline nol dengan benar dan jangan memberi kesan kausal.
- Buat pengalaman periode yang lebih proper: sediakan preset cepat (7/28/90 hari) dan pemilih rentang tanggal kustom dengan batas maksimum, validasi tanggal, tanggal akhir yang menghormati jeda data GSC, serta perbandingan periode sebelumnya yang panjangnya sama. Tampilkan tanggal aktual yang diminta/dikembalikan dan timezone yang dipakai.
- Tambahkan tabel query dan halaman dengan sort kolom klik, impresi, CTR, dan posisi; pagination atau load-more dibatasi.
- Tambahkan filter dimensi yang didukung GSC: device, country, search type (web/image/video/news sesuai API), dan tanggal/range.
- Tambahkan filter query/page (search contains), dengan validasi ukuran input dan pengiriman parameter aman.
- Buat navigasi dari query ke halaman terkait menggunakan request multi-dimension saat relevan; jelaskan bahwa hubungan query-halaman dapat terpotong oleh batas data/privacy.
- Buat halaman detail URL/query berbasis drill-down tanpa mengubah route publik.
- Berikan export CSV terbatas untuk tabel aktif (query/halaman dan periode/filter aktif), dengan perlindungan formula injection, batas row jelas, serta label sumber/range di nama atau metadata ekspor.
- Kembangkan tampilan mobile: tabel menjadi scrollable dengan kolom kunci tetap terbaca; grafik memiliki ringkasan teks/data.

**Kriteria selesai**

- Semua filter mengubah request server secara tervalidasi dan ditampilkan sebagai konteks laporan.
- Preset dan rentang tanggal kustom divalidasi server-side; rentang pembanding memiliki durasi yang sama dan tidak diam-diam memasukkan hari yang belum matang.
- Metrik komparatif memiliki definisi periode yang konsisten.
- Grafik/tabel memiliki skeleton, empty, error, dan partial-data state.
- CSV mencerminkan filter/range yang terlihat, dibatasi, dan aman saat dibuka di spreadsheet.
- Tes filter, parsing, perbandingan, pembatasan row, tanggal/range, dan CSV tersedia.

### Fase SEO-D3 — Insight dan peluang yang dapat ditindaklanjuti

**Pekerjaan**

- Buat daftar peluang berbasis aturan yang transparan, misalnya:
  - query dengan impresi material dan CTR relatif rendah;
  - query dengan posisi rata-rata pada rentang tertentu, untuk ditinjau peluang kontennya;
  - query/halaman yang klik atau impresinya turun dibanding periode pembanding;
  - halaman dengan impressions tetapi klik rendah.
- Jangan hardcode ambang bisnis yang belum disepakati. Sediakan threshold sebagai konfigurasi yang terlihat atau gunakan peringkat relatif, dan tandai sebagai heuristik.
- Setiap insight menjelaskan data dasar, periode, aturan pemicu, keterbatasan, dan satu tindakan manual yang disarankan.
- Hubungkan query/page ke URL publik tervalidasi; tampilkan 404/redirect secara hati-hati bila pemeriksaan tersedia.
- Catat tindakan editorial yang dipilih admin (misalnya “tinjau title”, “perbarui konten”, “abaikan”) dalam log audit non-PII dengan alasan opsional.
- Hindari klaim bahwa perubahan menyebabkan kenaikan ranking; sediakan pengingat untuk mengukur ulang setelah crawl dan data terkumpul.

**Kriteria selesai**

- Insight dapat ditelusuri ke metrik sumber, tidak berupa skor black-box.
- Setiap rekomendasi dapat diabaikan; tidak ada perubahan konten otomatis.
- Log tindakan mengikuti izin dan retention policy admin yang ada.

### Fase SEO-D4 — SEO teknis berbasis inventaris URL

**Tujuan:** memberi admin inventaris URL publik yang dapat diverifikasi. GSC Performance API tidak menyediakan laporan coverage/indexing penuh, sehingga status indexing tidak boleh disimpulkan dari ketiadaan klik.

**Pekerjaan**

- Buat inventaris URL publik dari sumber yang sudah ada: sitemap, daftar artikel, produk aktif, layanan, kota terkurasi, portofolio, kategori/tag yang memiliki konten.
- Audit untuk URL tersebut: HTTP response, redirect, canonical, robots/noindex, title/description, OG, structured data parseable, dan sitemap inclusion.
- Definisikan crawler internal berlingkup kecil: same-origin allowlist, batas concurrency/rate, timeout, maksimum response/body, tanpa mengikuti URL eksternal atau query arbitrer.
- Jalankan audit secara on-demand atau job admin; cegah SSRF dengan validasi origin dan resolver/network policy yang sesuai.
- Simpan hasil per run dengan `checkedAt`, status per rule, dan versi aturan; hapus/retensi hasil sesuai kebijakan.
- Status GSC URL Inspection API (bila dipertimbangkan) harus menjadi fase terpisah: perlu akses API yang sesuai, quota, dan pembatasan; jangan menyebutnya tersedia hanya dari Search Analytics.
- Tampilkan masalah terurut berdasarkan dampak teknis dan jumlah URL terdampak; prioritaskan critical yang dapat diverifikasi (noindex tak disengaja, canonical salah, sitemap URL error).

**Kriteria selesai**

- Cakupan URL dan batas crawler terdokumentasi.
- Tes keamanan SSRF, rate limit, timeout, redirect, dan sanitasi URL lulus.
- Laporan membedakan “tidak ditemukan dalam sitemap” dari “tidak terindeks Google”.

### Fase SEO-D5 — Workflow pengaturan dan konten

**Pekerjaan**

- Bangun editor preview snippet title/description dengan penghitung panjang dan panduan, bukan hard validation seolah Google memiliki batas pasti.
- Selaraskan label batas karakter pada Settings SEO dengan limit form/validasi yang aktual.
- Tampilkan preview Open Graph (judul, deskripsi, gambar) dan validasi gambar URL (format, ukuran/respons) secara aman.
- Buat checklist sebelum publish artikel/produk/layanan: title unik, deskripsi, canonical, indexability, alt image, internal link, schema sesuai jenis konten.
- Tampilkan validasi konten berbasis data tersimpan (mis. field kosong/duplikat) tanpa menghalangi publish kecuali aturan bisnis disetujui.
- Pertimbangkan hubungan antara meta default dan metadata per halaman agar admin paham kapan pengaturan default dipakai.
- Tambahkan preview metadata per halaman dari output final server-side, bila dapat dilakukan tanpa memuat seluruh halaman dengan efek samping.

**Kriteria selesai**

- Preview mencerminkan aturan metadata yang benar-benar dipakai aplikasi.
- Tidak mengubah metadata produksi tanpa save/konfirmasi eksplisit.
- A11y keyboard dan tes validasi form mencakup state invalid/dirty/saved.

### Fase SEO-D6 — Integrasi GA4 dan performa

**Pekerjaan opsional, setelah D1–D3 stabil**

- Tentukan dulu pertanyaan produk yang memerlukan GA4; jika hanya pageviews/conversions, gunakan event yang telah ditinjau dan minimalkan data pribadi.
- Bila mengambil GA4 Data API server-side, gunakan credential read-only terpisah, properti GA4 eksplisit, admin guard, status koneksi, quota handling, dan schema response yang berbeda dari GSC.
- Pisahkan funnel/event analytics dari GSC; definisikan atribusi, timezone, consent, retention, dan perbedaan sampling/thresholding.
- Pertimbangkan menautkan Vercel Speed Insights/CWV sebagai indikator performa pengalaman, bukan ranking langsung. Sumber Vercel mungkin memiliki API/plan/akses berbeda; jangan menganggap data dashboard Vercel tersedia otomatis dari aplikasi.
- Jangan membuat endpoint gabungan yang mengaburkan asal data. Dashboard dapat memiliki tab/sumber yang jelas.

**Kriteria selesai**

- Tujuan, sumber, credential, consent/privacy, biaya, dan batas API terdokumentasi.
- Tidak ada data PII yang tidak dibutuhkan; tes akses dan redaksi log lulus.

### Fase SEO-D7 — Rilis, observability, dan evaluasi

- Feature flag atau rilis bertahap untuk kapabilitas baru, terutama crawling dan API tambahan.
- Metrik operasional: request sukses/gagal per provider, latency, quota/rate limit, tanpa query sensitif/token pada log.
- Dokumentasi setup/deployment, troubleshooting, definisi metrik, keterbatasan, dan rollback.
- Uji pada preview/staging menggunakan akun/property nonproduksi bila tersedia; jangan membuat transaksi atau mengubah properti produksi saat verifikasi.
- QA HTML metadata/canonical/robots/JSON-LD pada sampel route statis dan dinamis.
- Rilis production setelah persetujuan admin dan review privacy/security.
- Evaluasi manfaat setelah periode data memadai; bandingkan baseline berdasarkan sumber/periode konsisten, tanpa menjanjikan hasil ranking.

---

## 6. Usulan susunan halaman dashboard

### Tab 1 — Ringkasan

- Status koneksi GSC dan waktu data terakhir.
- Pilihan periode, rentang tanggal aktual, dan perbandingan periode.
- Klik, impresi, CTR, posisi rata-rata **dari aggregate query yang benar**.
- Tren klik/impresi per hari.
- Peluang/perubahan penting dengan alasan yang dapat dibuka.

### Tab 2 — Query

- Tabel query dengan klik, impresi, CTR, posisi, perubahan periode, device/country filter.
- Search/filter, sort, pagination dan CSV.
- Detail query → halaman terkait bila tersedia.

### Tab 3 — Halaman

- Tabel landing page dengan metrik yang sama dan status perubahan.
- Drill-down ke query yang mengarah ke halaman.
- Link ke URL publik dan hasil audit teknis URL, bila fase D4 tersedia.

### Tab 4 — Kesehatan teknis

- Status inventaris URL, sitemap, canonical/indexability, metadata, structured data, broken links.
- Timestamp run, cakupan URL, masalah per tingkat keparahan.
- Penjelasan eksplisit bahwa pemeriksaan internal bukan bukti indexing Google.

### Tab 5 — Pengaturan & bantuan

- Status env GSC yang aman (configured/unconfigured; tidak pernah menampilkan JSON/key).
- Nilai properti GSC yang tidak rahasia bila aman ditampilkan.
- Checklist izin/API/env Vercel dan link ke panduan lokal yang benar.
- Tautan menuju Settings SEO untuk metadata default.

Implementasikan tab bertahap; jangan membuat semua tab kosong sebagai UI shell sebelum backend/definisi datanya siap.

---

## 7. Model data/API yang disarankan

Model konseptual untuk iterasi D1 (bukan komitmen nama field final):

```ts
type SeoReportStatus = "connected" | "not_configured" | "no_data" | "partial" | "error";

type SeoReport = {
  status: SeoReportStatus;
  source: "google_search_console";
  propertyLabel?: string;
  requestedRange: { startDate: string; endDate: string };
  fetchedAt: string;
  summary?: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  };
  comparison?: { /* nilai periode pembanding dan delta */ };
  topQueries: GscRow[];
  topPages: GscRow[];
  trend?: GscRow[];
  warningCode?: string;
};
```

Catatan: `position` adalah rata-rata posisi yang dilaporkan GSC, bukan ranking tetap setiap pencarian. Data query dapat di-threshold/dibatasi Google untuk privasi; total query tidak selalu sama dengan agregat properti. Jangan sertakan detail upstream mentah yang dapat mengungkap credential atau informasi internal.

---

## 8. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Summary top-N disangka total seluruh situs | Keputusan bisnis keliru | Aggregate query khusus; label sumber/metrik; tes pembeda tail data |
| API gagal ditampilkan sebagai nol | Admin mengira situs kehilangan traffic | Status `error`/`partial` terpisah dari `no_data`; error code aman |
| GSC memiliki jeda/thresholding | Perbandingan tanggal/query tidak lengkap | Tampilkan tanggal data dan catatan batasan; bandingkan periode setara |
| Banyak panggilan API/quota | Timeout atau throttling | Satu token per laporan, row limit, debounce, caching terkontrol, observability |
| Akses endpoint admin bocor | Data performa terekspos | `requireAdmin` pada semua endpoint, no-store, tes unauthorized |
| Crawler internal menjadi SSRF | Akses ke resource jaringan internal | Same-origin allowlist, larangan redirect ke host lain, batas jaringan/rate/body |
| “Skor SEO” memberi rasa yakin palsu | Fokus pada angka yang tidak menjelaskan masalah | Hindari skor komposit; tampilkan rule, bukti, cakupan, dan caveat |
| Rekomendasi otomatis mengubah metadata | Penurunan kualitas/brand atau SEO | Human review, preview, audit trail; tidak ada auto-publish |
| GA4 dan GSC disatukan tanpa definisi | Angka konflik/atribusi salah | Pisahkan sumber, timezone, definisi dan periode |
| Ambang title/description dianggap aturan Google | Konten dipotong/diubah tanpa kebutuhan | Jadikan guidance/preview, bukan validasi keras; selaraskan UI dengan schema |

---

## 9. Definition of Done umum

Untuk setiap fase yang dipilih:

1. Tes unit/pure, tes endpoint, dan tes UI yang relevan lulus.
2. `npx tsc --noEmit`, ESLint pada berkas terdampak, serta `git diff --check` lulus; build dilakukan sebelum rilis sesuai gate proyek.
3. Endpoint admin memvalidasi akses, input, range, timeout, dan error provider.
4. Tidak ada secret, private key, access token, atau data credential dalam UI/log/test fixture committed.
5. Loading, empty, unconfigured, partial, error, dan success states jelas serta aksesibel.
6. Dokumentasi konfigurasi/deployment dan keterbatasan data diperbarui.
7. Perubahan metrik/label tidak menyesatkan; semua insight dapat ditelusuri ke sumber.
8. Tidak ada perubahan otomatis pada metadata/konten publik tanpa aksi save/publish admin.
9. Status fase di dokumen ini diperbarui setelah benar-benar selesai dan diverifikasi.

---

## 10. Keputusan produk dan asumsi perencanaan

### 10.1 Keputusan yang sudah diberikan pemilik produk

| # | Topik | Keputusan | Dampak pada planning |
| --- | --- | --- | --- |
| 1 | Hak akses | Ikuti rekomendasi: gunakan akses admin yang sudah diterapkan melalui `requireAdmin`. | Semua endpoint dan halaman SEO tetap dalam boundary admin yang berlaku; role baru tidak dibuat. |
| 2 | Sumber analytics | Fokus GSC terlebih dahulu; GA4 tidak digabung pada iterasi awal. | D1–D3 berorientasi GSC. GA4 tetap fase opsional terpisah setelah kebutuhan dan privasi dievaluasi. |
| 3 | Periode | Buat lebih proper. | Dashboard mempertahankan preset 7/28/90 hari dan menambah rentang tanggal kustom yang tervalidasi, periode pembanding yang setara, serta penanganan jeda data. |
| 4 | Eksplorasi dan ekspor | Langsung proper: filter dan CSV masuk cakupan awal, bukan backlog opsional. | Fase D2 wajib meliputi filter negara/perangkat/jenis pencarian, pencarian query/URL, sort/pagination, dan export CSV terbatas/aman. |
| 5 | Cache | Ikuti rekomendasi teknis. | Pilih cache server singkat/terkontrol untuk efisiensi quota; TTL ditetapkan saat implementasi berdasarkan batas API dan kebutuhan kesegaran. UI tetap menunjukkan range/waktu pengambilan. Tidak ada cache publik untuk data admin. |
| 6 | Audit teknis URL | Ikuti rekomendasi: mulai manual/on-demand pada fase audit, bukan job terjadwal. | D4 dimulai dengan cakupan terbatas dan guard keamanan; penjadwalan hanya dipertimbangkan bila kebutuhan dan batas volume jelas. |
| 7 | History/retensi | Ikuti rekomendasi minimisasi data. | Tidak menyimpan history laporan atau status editorial pada awalnya kecuali ada kebutuhan yang disetujui; preferensi awal tanpa penyimpanan persisten. |
| 8 | Rekomendasi | Ikuti rekomendasi: aturan transparan/rule-based, bukan AI. | Insight menjelaskan pemicu, data, dan keterbatasan; seluruh tindakan manual, dapat diabaikan, tanpa auto-publish/auto-edit. |

### 10.2 Hal teknis yang masih perlu ditentukan saat implementasi

Tidak ada keputusan produk yang memblokir D1. Sebelum D2, implementasi perlu memilih batas rentang kustom maksimum, strategi hari jeda GSC, TTL server yang sesuai quota, dan batas maksimal ekspor. Ini adalah parameter teknis yang akan dipilih secara konservatif dan diuji; bukan perubahan keputusan produk di atas. Jika pilihan tersebut berdampak nyata pada pengalaman atau retensi, minta persetujuan sebelum memperluas cakupan.

### 10.3 Keputusan D6 (GA4) — terdokumentasi

Keputusan produk pemilik (25 Oktober 2026): **metrik keterlibatan + konversi kunci**, server-side, sebagai sumber terpisah dari GSC.

| Aspek | Isi |
| --- | --- |
| **Tujuan** | Melengkapi gambaran performa situs di luar pencarian: berapa orang datang dan terlibat (tampilan halaman, sesi, pengguna aktif, sesi terlibat), serta beberapa konversi kunci. Bukan untuk menilai peringkat. |
| **Pertanyaan produk yang dijawab** | (1) Apakah halaman membawa kunjungan & keterlibatan? (2) Apakah event konversi terpilih tercatat? (3) Bagaimana tren naik/turun antar periode? |
| **Sumber** | Google Analytics 4 Data API (`analyticsdata.googleapis.com/v1beta`, `properties.runReport`). Endpoint terpisah `GET /api/admin/seo/ga4`; tidak digabung dengan Search Console. |
| **Kredensial** | Service account read-only TERPISAH dari GSC: `GA4_SERVICE_ACCOUNT` (JSON satu baris, rahasia) + `GA4_PROPERTY_ID` (ID numerik properti). Scope `analytics.readonly`. Beri akses Viewer pada properti GA4. Tidak ada secret yang ditampilkan/dicatat (`redactSecrets`). |
| **Cakupan metrik** | Tampilan halaman (`screenPageViews`), sesi, pengguna aktif, sesi terlibat, rasio keterlibatan; halaman teratas; maksimum **3** event konversi (`GA4_CONVERSION_EVENTS`, dipisah koma). |
| **Consent & privasi** | Hanya data AGREGAT properti (bukan data pengguna individual); tidak ada PII yang diambil/di-storage. GA4 sisi klien tetap memakai `anonymize_ip` dan hanya aktif bila `NEXT_PUBLIC_GA_ID` diisi. Tidak ada tabel/persistent store baru. |
| **Biaya** | GA4 Data API termasuk dalam GA4 tanpa biaya tambahan; dibatasi kuota (core: 200.000 token/properti/hari; ± 40.000 token/jam/properti; batas permintaan serentak). Dibatasi juga oleh admin guard dan rentang ≤ 180 hari. Error kuota dipetakan ke `quota_limited` (pesan aman). |
| **Batas & keterbatasan** | GA4 dapat memakai sampling/thresholding; ada jeda pemrosesan (hari terakhir dikecualikan). Definisi metrik berbeda dari GSC sehingga **tidak boleh** dibandingkan langsung. Timezone mengikuti properti GA4. Estimasi bukan jaminan. |
| **Performa pengalaman** | Core Web Vitals ditautkan keluar ke Speed Insights Vercel (sumber berbeda) sebagai indikator pengalaman, **bukan** faktor peringkat langsung dan tidak dicampur dengan GA4/GSC. |

---

## 11. Urutan eksekusi yang direkomendasikan

**D0 → D1 → D2 (periode kustom + filter + CSV wajib) → D3 → D4 on-demand → D5 → D6 opsional → D7.**

Implementasi dimulai dari **D1: keandalan dan kebenaran data**, lalu **D2: eksplorasi dan rentang analitik**. D2 mencakup kebutuhan “lebih proper” yang diputuskan: preset dan tanggal kustom, pembanding setara, filter analitik, tabel yang dapat dieksplorasi, serta CSV aman. Jangan memperluas insight sebelum aggregate-versus-top-N dan status kegagalan dibereskan. D4 crawler on-demand dan D6 GA4 memiliki risiko/ketergantungan lebih tinggi dan tidak perlu menghambat dashboard GSC yang lebih baik.

---

## 12. Batas audit ini

- Ini adalah inspeksi repo dan rancangan engineering; bukan audit live website, Google Search Console coverage, data GA4, Core Web Vitals, ranking, backlink, atau log crawl production.
- Keberadaan env di mesin lokal/Vercel, kecocokan property, izin service account, enablement API, serta traffic aktual tidak disimpulkan dari source code.
- Tidak ada nilai secret yang dibaca atau ditulis dalam dokumen ini.
- Sebagian temuan pada `docs/2026-10-12-seo-konten-mesin.md` adalah baseline historis saat dokumen itu dibuat. Rencana rilis berikutnya harus menguji ulang output aktual setelah perubahan deployment, bukan mengandalkan checklist historis saja.
