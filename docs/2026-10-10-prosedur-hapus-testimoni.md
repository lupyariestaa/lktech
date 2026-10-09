# Prosedur Permintaan Hapus Testimoni (Taman Testimoni)

> Dokumen operasional. Dipakai admin ketika pemberi testimoni meminta penghapusan.
> Dasar: Q20 (pemberi bisa minta dihapus) dan `docs/2026-10-10-task-testimoni-taman-pixel.md` §9.
> Tanggal: 2026-10-10.

## 1. Prinsip

- Pemberi berhak meminta testimoninya dihapus kapan saja, tanpa alasan.
- Penghapusan menghapus **dua dokumen**: testimoni publik (`taman_testimonials`) dan data privat (`taman_private`, berisi email dan catatan bukti). Keduanya dihapus dalam satu batch.
- Audit tidak menyimpan email, uid, atau nama lengkap. Hanya id dokumen, jenis, dan waktu.

## 2. Ada dua jalur hapus

| Jalur | Siapa | Di mana | Keterangan |
| --- | --- | --- | --- |
| Mandiri | Pemberi | `/akun` → tab "Testimoni saya" → Hapus | Otomatis. Pemilik dicek dari token (bukan dari input). |
| Admin | Admin | `/admin/taman` → Detail → Hapus, atau bulk Hapus | Untuk permintaan lewat WhatsApp/email, atau pembersihan. |

Pemberi sebaiknya diarahkan ke jalur mandiri. Jalur admin dipakai bila pemberi tidak bisa masuk.

## 3. Langkah admin (permintaan lewat WhatsApp atau email)

1. **Verifikasi pemohon.** Cocokkan dengan pemberi testimoni:
   - Permintaan datang dari email atau nomor yang sama dengan yang tercatat di `taman_private` (cek di panel detail admin, bagian "Data privat").
   - Bila tidak cocok, minta pemohon menghapus sendiri lewat akun, atau kirim bukti kepemilikan. Jangan hapus atas permintaan dari pihak yang tidak terverifikasi.
2. **Cari testimoni.** Di `/admin/taman`, cari dengan nama atau email pemohon. Pastikan hanya testimoni milik pemohon yang dipilih.
3. **Hapus.** Buka Detail → **Hapus** → konfirmasi. Penghapusan ini permanen.
4. **Catat tindak lanjut.** Simpan pesan permintaan dan konfirmasi di arsip admin (di luar sistem). Sistem mencatat aksi hapus di audit tanpa data pribadi.
5. **Beri konfirmasi ke pemohon.** Sampaikan bahwa testimoni dan data terkait sudah dihapus.

Batas waktu yang disarankan: diproses paling lambat 3 hari kerja.

## 4. Yang ikut terhapus

- Teks testimoni dan nama tampil.
- Email, nama lengkap, dan catatan bukti persetujuan (`taman_private`).
- Tampilan di beranda: testimoni langsung hilang dari frame setelah cache publik kedaluwarsa (paling lama sekitar 1 menit untuk API, dan revalidate halaman).

## 5. Yang tidak ikut terhapus (dan kenapa)

- **Ulasan produk asal** (`reviews`). Ulasan adalah catatan transaksi terpisah. Bila pemberi juga ingin ulasannya dihapus, itu permintaan terpisah dan dijalankan dari modul ulasan.
- **Catatan audit** (`admin_audit`). Audit hanya berisi id dokumen, jenis, dan waktu, tanpa data pribadi. Audit disimpan untuk keperluan keamanan.
- **Data order dan akun pengguna.** Di luar lingkup testimoni.

## 6. Testimoni contoh (sample)

Contoh (`kind: sample`) tidak punya pemberi nyata dan tidak pernah tampil publik. Hapus semua contoh dengan tombol "Hapus contoh" di `/admin/taman` (hanya tampil saat development).

## 7. Yang tidak boleh dilakukan

- Menghapus atas permintaan tanpa verifikasi pemohon.
- Menyimpan salinan email atau isi testimoni di luar sistem setelah penghapusan diminta, kecuali untuk arsip permintaan hapus (nama dan waktu permintaan saja).
- Mengubah testimoni milik orang lain sebagai pengganti penghapusan.

## 8. Verifikasi setelah hapus (checklist)

- [ ] Testimoni tidak lagi muncul di `/admin/taman`.
- [ ] Testimoni tidak lagi muncul di `GET /api/taman` (publik).
- [ ] Testimoni tidak lagi muncul di frame beranda setelah cache kedaluwarsa.
- [ ] Pemberi tidak lagi melihat testimoninya di `/akun` (tab "Testimoni saya").

## 9. Riwayat

| Tanggal | Permintaan | Diproses oleh | Hasil |
| --- | --- | --- | --- |
| | | | |
