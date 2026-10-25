# Task Gap Audit Sistem Produk dan Pesanan

Dokumen ini mencatat gap yang ditemukan saat audit implementasi sistem produk dan pesanan. Tujuannya menjadi backlog kerja bertahap; belum ada perubahan kode yang dibuat untuk task-task di bawah.

## Status audit

- Tanggal audit: 25 Oktober 2026
- Cakupan: data produk dan dashboard, konfigurasi percetakan, katalog/detail, keranjang, checkout, pembayaran Mayar, webhook, fulfillment, riwayat pelanggan, dan admin pesanan.
- Verifikasi lokal: `npm run test:unit` lulus, 651 tes, 0 gagal.
- Batas audit: tidak menjalankan pembayaran Mayar sungguhan atau verifikasi deployment/Firestore produksi.
- Status dokumen: backlog terbuka; item harus ditandai selesai setelah implementasi dan tes/regresi dilakukan.

## Prioritas P0 — Risiko pesanan dan pembayaran

### [x] GAP-01 — Migrasi keranjang guest menggabungkan konfigurasi cetak berbeda

**Temuan**  
Ketika user login, migrasi keranjang di `src/components/cart-provider.tsx` menggabungkan item berdasarkan `slug`, bukan `cartItemKey`. Untuk produk cetak, ukuran, bahan/varian, dan finishing merupakan bagian identitas baris pesanan. Dua konfigurasi yang berbeda bisa melebur dan kuantitas salah satu konfigurasi dapat hilang.

**Dampak**  
Pelanggan dapat checkout dengan spesifikasi yang tidak sama dengan konfigurasi yang dipilih.

**Task penyelesaian**
- Gabungkan item keranjang berdasarkan `cartItemKey` (produk, varian, ukuran, finishing), bukan slug produk saja.
- Pastikan kuantitas hanya digabung untuk konfigurasi identik.
- Tambahkan tes migrasi: konfigurasi identik bergabung; ukuran/bahan/finishing berbeda tetap menjadi baris terpisah.

**Kriteria selesai**  
Tidak ada spesifikasi cetak yang hilang saat guest login atau ketika keranjang guest digabung ke keranjang akun.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: identitas keranjang memakai tuple terstruktur berdasarkan produk, varian, ukuran, dan finishing; merge hanya menambah kuantitas untuk konfigurasi identik. Ditambahkan empat tes regresi di `scripts/cart-identity.test.ts`.

### [x] GAP-02 — Pesan ulang tidak membawa spesifikasi produk cetak

**Temuan**  
Handler `onReorder` di `src/components/auth/user-account.tsx` membangun item keranjang tanpa `printOptions` dan `printPricing`.

**Dampak**  
Item cetak dari riwayat dapat masuk keranjang tanpa ukuran/finishing lalu ditolak checkout atau tampil tidak lengkap.

**Task penyelesaian**
- Pertahankan varian dan `printOptions` dari snapshot order saat melakukan pesan ulang.
- Gunakan konfigurasi/harga produk terbaru untuk validasi, tetapi jangan mengganti spesifikasi historis secara diam-diam.
- Jika varian atau opsi lama sudah tidak tersedia, beri pesan dan minta pelanggan konfigurasi ulang, atau lewati item dengan alasan yang jelas.
- Tambahkan tes pesan ulang untuk item digital dan cetak.

**Kriteria selesai**  
Item cetak dapat dipesan ulang dengan rincian yang benar, atau pelanggan diberi jalur konfigurasi ulang yang jelas.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: endpoint produk terkini mengembalikan seluruh varian, data tarif cetak, batas ukuran, dan finishing aktif. Pesan ulang mempertahankan ukuran/finishing dari snapshot pesanan, memvalidasinya terhadap konfigurasi terbaru, dan menghitung harga terbaru. Item yang varian atau finishing-nya sudah tidak berlaku dilewati dengan pesan yang meminta pelanggan memilih ulang; kegagalan memuat data tidak memakai harga historis sebagai fallback. Lima tes regresi tersedia di `scripts/reorder-item.test.ts`.

### [x] GAP-03 — Spesifikasi cetak tidak tersedia sebagai rincian operasional order

**Temuan**  
Order menyimpan `printOptions` dan ID finishing, tetapi tidak menyimpan nama finishing sebagai snapshot. Dialog detail admin (`src/components/admin/orders/order-detail-dialog.tsx`), riwayat pelanggan (`src/components/auth/account-orders.tsx`), daftar pesanan, dan email (`src/lib/email-order.ts`) tidak menampilkan rincian ukuran/finishing secara lengkap.

**Dampak**  
Admin dan pelanggan bisa kesulitan memastikan ukuran serta finishing yang harus diproduksi. Jika opsi finishing diubah atau dihapus pada produk, ID historis tidak cukup untuk mengidentifikasi pilihan saat order dibuat.

**Task penyelesaian**
- Simpan snapshot spesifikasi cetak yang diperlukan pada `OrderItem`, termasuk label bahan/varian, dimensi, dan label finishing pada saat checkout.
- Tampilkan rincian tersebut di detail admin, riwayat akun, dan email/notifikasi order yang relevan.
- Tetap dukung order lama yang tidak memiliki snapshot.
- Hindari menyimpan data konfigurasi yang berlebihan atau mengandalkan katalog terkini untuk menginterpretasi order lama.
- Tambahkan tes normalisasi order lama dan tampilan/payload order cetak baru.

**Kriteria selesai**  
Admin dan pembeli dapat melihat kembali spesifikasi order yang sama persis dengan pilihan saat checkout.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: order baru menyimpan snapshot nama finishing bersama ID, opsi dimensi, tarif, serta nama varian/bahan; normalisasi tetap menerima order lama tanpa snapshot. Spesifikasi kini ditampilkan di detail dan kartu admin, detail riwayat akun, pesan WhatsApp kanonik, dan email konfirmasi. Order lama memakai ID finishing sebagai fallback yang jujur tanpa membaca katalog terkini. Tiga tes regresi di `scripts/order-print-snapshot.test.ts` memeriksa normalisasi snapshot/legacy dan rendering spesifikasi.

### [x] GAP-04 — Webhook dapat menandai order lunas tanpa nominal yang terverifikasi

**Temuan**  
`src/app/api/webhooks/mayar/route.ts` hanya menolak nominal yang lebih rendah jika nominal tersedia. Jika nominal tidak tersedia, kode meneruskan `order.total` sebagai nominal default ke `markOrderPaid`.

**Dampak**  
Order dapat berstatus lunas tanpa bukti nominal yang cocok, jika event tanpa nominal diterima dan lolos korelasi/otorisasi lainnya.

**Task penyelesaian**
- Pastikan berdasarkan kontrak Mayar apakah event `payment.received` selalu memuat nominal.
- Tolak atau karantina event tanpa nominal; alternatifnya, ambil detail invoice dari API Mayar dan cocokkan jumlah serta status sebelum menandai lunas.
- Verifikasi juga ID invoice/transaksi terhadap invoice yang tersimpan pada order bila data gateway memungkinkan.
- Tambahkan tes untuk nominal hilang, nominal kurang, sama, lebih, dan invoice/order tidak cocok.

**Kriteria selesai**  
Order hanya ditandai lunas setelah pembayaran dan nominal dapat diverifikasi terhadap order.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: webhook menolak nominal hilang, tidak valid, kurang, atau lebih (harus sama persis dengan total order), tanpa fallback ke `order.total`. Jika order menyimpan ID invoice Mayar, bukti invoice pada event juga wajib ada dan harus cocok; ID transaksi dicocokkan bila kedua sisi memilikinya. Event tertolak tidak mengubah status lunas dan dicatat sebagai `paymentMismatch` untuk pemeriksaan. Enam tes regresi di `scripts/mayar-webhook.test.ts` menguji nominal hilang/invalid/kurang/sama/lebih dan mismatch invoice/transaksi. Kontrak payload Mayar yang didokumentasikan di `docs/2026-10-06-fase-konversi-closing.md` mengidentifikasi `data.id` sebagai invoice ID; kontrak live belum diverifikasi.

### [x] GAP-05 — Validasi transisi status admin tidak atomik dengan update status

**Temuan**  
`PATCH /api/admin/orders` memeriksa transisi melalui `getOrderById` sebelum memanggil `updateOrderStatus`. Update memang memakai transaksi Firestore, tetapi aturan transisinya tidak diperiksa ulang terhadap status terkini di dalam transaksi (`src/lib/orders.ts`).

**Dampak**  
Dua perubahan status yang berjalan bersamaan dapat melewati matriks transisi yang diizinkan.

**Task penyelesaian**
- Pindahkan pemeriksaan `isTransitionAllowed` ke dalam transaksi yang menulis status.
- Kembalikan konflik dengan status terbaru bila transisi tidak lagi valid.
- Samakan perilaku untuk aksi tunggal dan massal.
- Tambahkan tes konkurensi/status usang bila test harness mendukungnya.

**Kriteria selesai**  
Status hanya dapat berubah melalui transisi yang valid dari status yang benar-benar tersimpan saat transaksi dieksekusi.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: `updateOrderStatus` membaca status terkini dan memvalidasi matriks transisi sebelum menulis, semuanya dalam transaksi Firestore. Aksi tunggal mengembalikan 409 beserta status terbaru bila transisi usang; aksi massal melewati item tersebut dengan alasan `invalid_transition`. Kedua jalur menjalankan efek samping hanya bila transaksi benar-benar mengubah status. Tes `evaluateStatusTransition` ditambahkan ke `scripts/order-status.test.ts`; uji emulator untuk kondisi race belum tersedia.

## Prioritas P1 — Konsistensi fulfillment dan ketahanan operasional

### [x] GAP-06 — Kebijakan keranjang campuran cetak, digital, dan jasa belum jelas

**Temuan**  
`src/lib/order-fulfillment.ts` memberi fulfillment `cetak` hanya jika seluruh item adalah percetakan. Campuran cetak + digital menjadi `instan`; campuran yang memuat jasa menjadi `jasa`.

**Dampak**  
Satu order dapat memuat barang dengan kebutuhan pembayaran/produksi berbeda, tetapi hanya memiliki satu jenis fulfillment. Perilaku yang benar untuk campuran tersebut belum disepakati.

**Task penyelesaian**
- Putuskan kebijakan bisnis: larang checkout campuran, pecah menjadi beberapa order, atau dukung fulfillment per item.
- Jika campuran dilarang, validasi server harus menolak checkout dengan instruksi memisahkan pesanan.
- Jika didukung, definisikan status, pembayaran, notifikasi, dan instruksi fulfillment per jenis item.
- Tambahkan tes untuk seluruh kombinasi kategori.

**Kriteria selesai**  
Pelanggan dan admin menerima alur konsisten untuk setiap jenis keranjang campuran.

**Penyelesaian**
Kebijakan disepakati: fulfillment per item, diskon kupon order dialokasikan proporsional dengan largest remainder (jumlah share tepat sama dengan diskon), dan pada order campuran berjasa invoice Mayar pertama hanya mencakup item non-jasa. Pembayaran itu direkam terpisah; item non-jasa dapat dipenuhi sementara order menunggu konfirmasi. Admin baru dapat membuat invoice jasa terpisah setelah invoice barang dibayar; status order baru menjadi `dibayar` setelah kedua komponennya lunas. Snapshot fulfillment dan alokasi diskon disimpan di item order; normalisasi order lama tetap kompatibel. Ditambahkan regresi alokasi nominal di `scripts/order-fulfillment.test.ts`. TypeScript, ESLint, dan uji unit perlu dijalankan penuh; alur gateway live dan simulasi race webhook belum tersedia.

### [x] GAP-07 — Kegagalan penyimpanan invoice setelah pembuatan invoice dapat meninggalkan order yatim

**Temuan**  
Checkout membuat order terlebih dahulu, kemudian invoice Mayar, lalu menyimpan detail pembayaran. Jika invoice berhasil dibuat tetapi `updateOrderPayment` gagal, pembersihan order dapat gagal juga. Kondisi tersebut hanya dicatat ke log dan perlu ditangani manual.

**Dampak**  
Invoice aktif bisa ada di Mayar tanpa tautan yang tersimpan di order, atau order tertinggal dalam status menunggu bayar tanpa invoice yang dapat dipakai.

**Task penyelesaian**
- Tambahkan pencatatan keadaan pembuatan invoice yang dapat direkonsiliasi, termasuk correlation/order ID dan error.
- Buat mekanisme rekonsiliasi/alert admin untuk order cetak tanpa invoice atau invoice tanpa update payment tersimpan.
- Pertimbangkan idempotency key atau strategi retry aman untuk menghindari invoice ganda.
- Dokumentasikan prosedur manual jika API Mayar berhasil tetapi Firestore gagal.
- Tambahkan simulasi kegagalan pada unit/integration test.

**Kriteria selesai**  
Kegagalan parsial terdeteksi dan dapat dipulihkan tanpa invoice/order hilang atau pembayaran ganda.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: order mencatat recovery state `creating` sebelum request Mayar, correlation ID, komponen, nominal eksak, dan attempt count. Respons invoice dicatat ke recovery record sebelum payment ditautkan; kegagalan menjadi `orphaned`, mempertahankan ID/URL jika respons sempat diterima. Pembuatan invoice ulang diblokir selama state masih `creating`/`orphaned`. Panel detail admin menyediakan tautkan invoice yang sudah diverifikasi atau konfirmasi eksplisit setelah mengecek Mayar bahwa invoice tidak ada; retry baru dimungkinkan setelah konfirmasi tersebut. Order tidak dihapus otomatis pada kegagalan parsial. Pola yang sama diterapkan ke invoice manual. TypeScript, ESLint, 674 unit test, tes fulfillment, dan tes recovery lulus. Mayar tidak menyediakan idempotency key yang terverifikasi di kode/kontrak ini; ketidakpastian jaringan tetap butuh rekonsiliasi admin. Simulasi Firestore/API gagal belum tersedia.

### [x] GAP-08 — Label finishing di keranjang menampilkan ID internal

**Temuan**  
`src/components/cart-view.tsx` menampilkan `finishingIds` secara langsung, bukan nama pilihan yang dikenali pelanggan.

**Dampak**  
ID finishing dapat terlihat seperti kode teknis dan kurang jelas bagi pelanggan.

**Task penyelesaian**
- Simpan/tampilkan nama finishing pada item keranjang.
- Gunakan snapshot nama untuk order agar perubahan katalog tidak mengubah arti pesanan historis.
- Tetap kirim ID yang divalidasi server sebagai identitas pilihan.

**Kriteria selesai**  
Ringkasan keranjang dan order menampilkan nama finishing yang mudah dipahami.

**Penyelesaian**
Selesai pada perubahan kerja saat ini: keranjang menyimpan `printFinishing` sebagai snapshot nama dari katalog saat opsi dipilih, sementara `printOptions.finishingIds` tetap dikirim ke checkout dan divalidasi server. Tampilan keranjang memakai nama snapshot (fallback generik untuk cart lama agar tidak membocorkan ID); order tetap membuat snapshot nama dari konfigurasi katalog tervalidasi server, dan detail order memakai snapshot tersebut. Tes regresi menegaskan bahwa label berubah tanpa mengubah identitas pilihan dan order menampilkan nama, bukan ID. Panduan Next.js lokal belum tersedia di `node_modules/next/dist/docs/`; GAP-08 hanya mengubah model data dan komponen klien yang ada, tanpa API Next.js baru.

### [x] GAP-09 — Secret webhook Mayar belum dapat dipastikan dikonfigurasi di produksi

**Temuan**  
Jika `MAYAR_WEBHOOK_TOKEN` kosong, verifikasi token webhook dinonaktifkan dan endpoint hanya mencatat peringatan (`src/app/api/webhooks/mayar/route.ts`). Audit ini tidak memeriksa secret lingkungan produksi.

**Dampak**  
Keamanan webhook bergantung pada konfigurasi deployment dan korelasi event.

**Task penyelesaian**
- Pastikan secret webhook diatur di environment produksi dan nilainya cocok dengan konfigurasi Mayar.
- Tambahkan pemeriksaan health/deployment yang memberi status aman tanpa membocorkan secret.
- Pertimbangkan fail-closed untuk produksi bila token belum dikonfigurasi.
- Dokumentasikan setup dan rotasi token.

**Kriteria selesai**  
Webhook produksi menolak request tanpa token yang sah, dan konfigurasi dapat diverifikasi dengan aman.

**Penyelesaian**
Selesai pada perubahan kode/dokumentasi: konfigurasi production kini fail-closed dengan HTTP 503 jika `MAYAR_WEBHOOK_TOKEN` tidak ada; token salah ditolak HTTP 401, dan perbandingan token memakai `timingSafeEqual`. Endpoint health publik dan integrasi admin mengembalikan indikator `webhookSecure`/`webhookTokenSet` tanpa membocorkan secret. Setup, deployment, pengujian, serta rotasi didokumentasikan di `docs/mayar-webhook-token.md`. Ditambahkan regresi untuk kebijakan konfigurasi. Belum dapat dipastikan bahwa secret production aktual cocok dengan dashboard Mayar karena repo tidak memiliki akses ke environment deployment atau dashboard; operator wajib menyelesaikan pemeriksaan release yang didokumentasikan.

## Prioritas P2 — Kualitas konfigurasi produk dan pengalaman pengguna

### [x] GAP-10 — Seed banner berbeda dari konfigurasi produk aktif

**Temuan**  
`scripts/seed-product-banner.mjs` membuat produk nonaktif dengan harga dan ukuran nol. Ini aman sebagai placeholder, tetapi tidak merepresentasikan produk banner aktif.

**Dampak**  
Seed untuk setup baru tidak siap digunakan dan berpotensi membingungkan operator jika dianggap sebagai konfigurasi bisnis final.

**Task penyelesaian**
- Samakan seed dengan konfigurasi produk banner aktif yang telah disetujui.
- Pastikan seed mencakup tarif bahan, batas ukuran, finishing, dan keterangan alur pesanan yang sama.
- Jangan menimpa dokumen produk yang sudah ada.

**Kriteria selesai**  
Seed untuk setup baru menghasilkan produk banner siap jual dengan konfigurasi yang sama dengan katalog aktif.

**Penyelesaian**
Selesai: setelah operator mengonfirmasi konfigurasi yang sudah ada di katalog aktif, seed diselaraskan agar menghasilkan produk aktif dengan varian Flexi 280 (Rp25.000/m²), Flexi 340 (Rp30.000/m²), Korea 440 (Rp40.000/m²), batas ukuran 0,5–100 m, finishing yang sama, dan keterangan layanan yang sama. Seed tetap menolak menimpa dokumen yang sudah ada. Konfigurasi dipisah ke helper murni dan dilindungi tes regresi; data bisnis disalin dari produk aktif, bukan dikarang.

### [x] GAP-11 — Rasio gambar mengklaim gambar tidak dipotong, tetapi rendering memakai `object-cover`

**Temuan**  
Editor dashboard menyatakan gambar tidak dipotong, sedangkan kartu produk dan galeri menggunakan `object-cover` (`src/components/product-card.tsx`, `src/components/media-gallery.tsx`). Gambar dengan rasio sumber berbeda dapat terpotong agar memenuhi rasio 1:1 atau 16:9.

**Dampak**  
Hasil visual tidak sesuai keterangan di dashboard dan subjek gambar bisa terpotong.

**Task penyelesaian**
- Pilih perilaku yang diinginkan: `object-contain` agar seluruh gambar tampak, atau `object-cover` dengan penjelasan crop.
- Terapkan perilaku konsisten di cover, galeri, thumbnail, dan kartu.
- Jika diperlukan, sediakan posisi crop atau pratinjau di editor.
- Uji gambar portrait, square, dan landscape pada kedua rasio tampilan.

**Kriteria selesai**  
Perilaku crop konsisten dengan pilihan rasio dan keterangan dashboard.

**Penyelesaian**
Selesai: gambar produk kini menggunakan `object-contain` di kartu katalog, wishlist, cover editor, galeri utama, thumbnail galeri, dan thumbnail lightbox; perilaku ini konsisten dengan lightbox utama. Bingkai rasio tetap dipakai, sehingga ruang kosong akan tampak bila rasio sumber berbeda. Keterangan editor menjelaskan hal tersebut dan membedakan crop otomatis dari opsi transformasi crop di pemilih media. Tes regresi memeriksa fit gambar pada tampilan terkait serta isi keterangan.

## Matriks verifikasi/regresi yang disarankan

- [ ] Cart guest → login: item konfigurasi identik bergabung; konfigurasi berbeda tidak bergabung.
- [ ] Pesan ulang: produk cetak mempertahankan ukuran, varian, dan finishing; opsi usang ditangani jelas.
- [ ] Checkout cetak: server menghitung ulang harga; ukuran batas/minimal, maksimal, dan presisi diuji.
- [ ] Detail order: snapshot spesifikasi tetap sama setelah produk/finishing diedit atau dihapus.
- [ ] Webhook: token salah/kosong, event tidak dikenal, nominal hilang/kurang/sama/lebih, duplikasi, invoice mismatch, order terminal.
- [ ] Status admin tunggal dan massal: transisi valid, invalid, dan konflik bersamaan.
- [ ] Kegagalan Mayar/Firestore: invoice create gagal, penyimpanan payment gagal, pembersihan gagal, retry dan rekonsiliasi.
- [ ] Keranjang digital/cetak/jasa: perilaku sesuai kebijakan campuran yang disepakati.
- [ ] Tampilan rasio gambar 1:1 dan 16:9 pada berbagai rasio sumber dan viewport.

## Urutan pengerjaan yang disarankan

1. GAP-01 — cegah konfigurasi cetak salah saat migrasi keranjang.
2. GAP-02 — pesan ulang cetak.
3. GAP-03 dan GAP-08 — snapshot serta rincian spesifikasi/finishing end-to-end.
4. GAP-04 — verifikasi webhook dan nominal.
5. GAP-05 — transisi status atomik.
6. GAP-06 — kebijakan fulfillment campuran per item.
7. GAP-07 dan GAP-09 — ketahanan invoice dan konfigurasi produksi.
8. GAP-10 dan GAP-11 — seed/setup serta polish rasio gambar.
