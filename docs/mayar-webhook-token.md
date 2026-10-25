# Setup dan rotasi token webhook Mayar

## Setup production

1. Buat/gunakan token acak kuat yang hanya dipakai untuk webhook Mayar. Jangan commit token, masukkan ke URL publik, atau mengirimkannya melalui chat/log.
2. Simpan nilainya sebagai secret environment `MAYAR_WEBHOOK_TOKEN` pada environment **Production** di platform deployment. Jangan gunakan prefix `NEXT_PUBLIC_`.
3. Pastikan URL webhook di dashboard Mayar menunjuk ke `https://<domain-produksi>/api/webhooks/mayar` dan atur token yang sama pada header `x-webhook-token` atau parameter `token` sesuai dukungan konfigurasi Mayar.
4. Deploy/restart production agar server memuat secret.
5. Verifikasi `GET /api/health/payment` atau Integrations di admin: `mayar.webhookTokenSet` dan `mayar.webhookSecure` harus `true`. Endpoint hanya mengembalikan status boolean, bukan nilai token.
6. Uji delivery/test URL di dashboard Mayar. Event `testing` hanya menguji keterjangkauan endpoint; bukan bukti bahwa secret pada event pembayaran cocok. Validasi event pembayaran nyata di sandbox sebelum mengandalkan konfigurasi.
7. Pastikan event pembayaran tanpa token atau dengan token salah menghasilkan HTTP 401, dan pembayaran tidak mengubah status order.

Production fail-closed: apabila `MAYAR_WEBHOOK_TOKEN` kosong, event pembayaran ditolak dengan HTTP 503. Event `testing` tetap dikecualikan karena Mayar dapat mengirimkannya tanpa token; event ini tidak memproses pembayaran.

## Rotasi

1. Siapkan token baru dan batasi aksesnya ke operator yang mengelola deployment dan Mayar.
2. Koordinasikan perubahan secret environment dan token konfigurasi webhook Mayar dalam jendela yang sama. Jika provider mendukung dua token aktif, tambahkan token baru dahulu, deploy, verifikasi, lalu cabut token lama. Jika hanya mendukung satu token, lakukan pergantian terkoordinasi dan uji delivery segera.
3. Restart/deploy aplikasi setelah secret berubah; verifikasi status boolean dan event uji.
4. Uji bahwa token lama ditolak setelah rotasi dan token baru diterima lewat event pembayaran sandbox yang sah.
5. Jangan mencatat nilai token pada tiket, log, screenshot, atau test report. Bila token terekspos, rotasi segera dan tinjau log deployment.

## Pemeriksaan release

Repo tidak memiliki akses ke secret store atau dashboard Mayar. Operator deployment tetap wajib memeriksa environment Production secara langsung; status health hanya menunjukkan bahwa variabel tersedia di proses yang sedang berjalan, bukan bahwa nilainya sama dengan konfigurasi Mayar.
