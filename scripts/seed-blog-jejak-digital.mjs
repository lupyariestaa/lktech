/**
 * Seed artikel blog LKTech tentang jejak digital dan privasi.
 * Jalankan dari root project: node scripts/seed-blog-jejak-digital.mjs
 * Menulis secara idempoten ke articles/<slug>.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.error(`✗ Tidak menemukan .env.local di ${path}`);
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

if (!projectId || !clientEmail || !privateKey) {
  console.error("✗ Kredensial Firebase Admin tidak lengkap di .env.local.");
  process.exit(1);
}

const article = {
  slug: "jejak-digital-cara-mengurangi-data-pribadi-online",
  title: "Jejak Digital: Cara Mengurangi Data Pribadi yang Tersebar Online",
  excerpt:
    "Setiap akun, unggahan, dan izin aplikasi dapat meninggalkan jejak digital. Kenali langkah praktis untuk menemukan, membatasi, dan melindungi informasi pribadi Anda di internet.",
  body: `Nama, foto, alamat email, lokasi, dan kebiasaan berselancar dapat tersebar di banyak layanan digital. Sebagian informasi dibagikan dengan sengaja, misalnya saat mengunggah foto atau membuat profil. Sebagian lainnya dikumpulkan ketika kita menggunakan aplikasi, mendaftar layanan, atau menerima pengaturan privasi bawaan tanpa memeriksanya.

Jejak digital tidak selalu buruk. Riwayat transaksi membantu kita memantau belanja, dan profil profesional dapat membuka peluang kerja. Namun, informasi yang tersebar terlalu luas atau dibiarkan tanpa pengelolaan dapat meningkatkan risiko penipuan, pengambilalihan akun, pesan yang tidak diinginkan, hingga terbukanya informasi sensitif.

Mengurangi jejak digital bukan berarti harus berhenti menggunakan internet atau menghapus semua akun. Tujuannya adalah membuat keputusan yang lebih sadar: informasi apa yang dibagikan, kepada siapa, untuk keperluan apa, dan berapa lama informasi itu perlu disimpan.

## Pahami dua jenis jejak digital

Jejak digital aktif terbentuk saat kita sengaja melakukan sesuatu, seperti mengunggah foto, menulis komentar, mengisi formulir, atau mengirim pesan. Jejak pasif dapat terbentuk ketika layanan mengumpulkan data penggunaan, seperti halaman yang dikunjungi, perangkat yang dipakai, atau perkiraan lokasi.

Data yang dikumpulkan berbeda-beda menurut layanan dan pengaturan yang dipilih. Karena itu, jangan berasumsi bahwa semua aplikasi mengumpulkan informasi yang sama. Periksa kebijakan privasi dan pengaturan akun untuk mengetahui data apa yang digunakan serta pilihan yang tersedia.

## Mulai dengan audit akun

Langkah pertama yang praktis adalah membuat daftar akun yang masih digunakan. Periksa email, media sosial, toko daring, layanan hiburan, aplikasi produktivitas, dan akun lama yang mungkin sudah terlupakan. Pengelola kata sandi dapat membantu melihat akun tersimpan, tetapi pastikan perangkat dan pengelola tersebut terlindungi dengan baik.

Untuk setiap akun, tanyakan:

- Apakah saya masih memakai layanan ini?
- Informasi apa yang tersimpan di profil?
- Apakah akun terhubung ke aplikasi atau layanan lain?
- Apakah metode pemulihan akun masih benar dan aman?
- Apakah ada riwayat atau berkas pribadi yang sebaiknya diunduh atau dihapus?

Jika akun tidak lagi diperlukan, gunakan fitur penutupan akun resmi. Menghapus aplikasi dari ponsel saja biasanya tidak sama dengan menghapus akun atau data yang tersimpan di layanan. Ikuti instruksi penyedia dan simpan konfirmasi penutupan bila diberikan.

## Batasi informasi di profil dan unggahan

Tinjau informasi profil yang terlihat publik. Tanggal lahir lengkap, alamat rumah, nomor telepon, lokasi rutin, dan detail keluarga dapat membantu orang lain menyusun gambaran tentang diri kita. Hapus atau sembunyikan informasi yang tidak diperlukan untuk tujuan akun tersebut.

Sebelum mengunggah foto atau dokumen, perhatikan apa yang tampak di dalamnya. Foto dapat memperlihatkan kartu identitas, tiket, label paket, layar komputer, lokasi rumah, atau informasi orang lain. Metadata pada berkas juga mungkin menyimpan informasi tertentu, tergantung perangkat dan cara berkas dibuat atau dibagikan.

Atur audiens unggahan agar sesuai. Tidak semua pembaruan perlu terlihat oleh publik. Periksa juga unggahan lama, komentar, daftar teman, foto yang menandai Anda, serta informasi yang muncul saat nama dicari. Jika menemukan konten pribadi yang tidak semestinya tampil, gunakan fitur penghapusan atau pelaporan dari platform terkait.

## Periksa izin aplikasi

Aplikasi sebaiknya hanya memperoleh akses yang dibutuhkan untuk fungsinya. Aplikasi peta mungkin memerlukan lokasi ketika navigasi digunakan, tetapi belum tentu perlu mengaksesnya setiap saat. Aplikasi pengedit foto mungkin membutuhkan akses ke foto yang dipilih, bukan seluruh kontak.

Periksa pengaturan privasi dan izin di ponsel secara berkala. Cabut akses lokasi, mikrofon, kamera, kontak, foto, atau Bluetooth jika sudah tidak diperlukan. Bila sistem menyediakan pilihan akses terbatas atau hanya saat aplikasi digunakan, pertimbangkan pilihan tersebut. Nama menu dan opsi dapat berbeda menurut perangkat dan versi sistem operasi.

Periksa pula koneksi pihak ketiga pada akun utama, seperti aplikasi yang memakai fitur “Masuk dengan ...”. Hapus layanan yang sudah tidak digunakan atau tidak lagi dipercaya. Mencabut koneksi dapat menghentikan akses berikutnya, tetapi belum tentu menghapus salinan data yang sebelumnya telah diterima layanan pihak ketiga; periksa kebijakan dan pengaturan layanan tersebut.

## Kurangi pelacakan yang tidak diperlukan

Tinjau pilihan personalisasi iklan dan aktivitas akun pada layanan yang digunakan. Beberapa layanan menyediakan kontrol untuk menghapus riwayat, membatasi personalisasi, atau menonaktifkan pencatatan tertentu. Pilih pengaturan yang sesuai dengan kenyamanan Anda, dan ingat bahwa pilihan ini tidak selalu menghentikan seluruh pengumpulan data yang dibutuhkan untuk menjalankan layanan.

Di browser, tinjau cookie dan data situs secara berkala, batasi izin situs, dan hapus ekstensi yang tidak dikenal. Mode privat dapat mengurangi penyimpanan riwayat lokal di perangkat, tetapi tidak membuat aktivitas sepenuhnya anonim bagi situs, penyedia jaringan, atau layanan yang digunakan. VPN pun tidak otomatis menghapus jejak digital; ia hanya mengubah sebagian jalur koneksi dan siapa yang dapat melihat informasi tertentu.

## Lindungi informasi yang tetap harus disimpan

Tidak semua data dapat dihapus, dan beberapa layanan perlu menyimpan informasi tertentu untuk menjalankan fungsi atau memenuhi kewajiban yang berlaku. Karena itu, perlindungan akun tetap penting. Gunakan kata sandi unik, aktifkan autentikasi multifaktor atau passkey bila tersedia, dan pastikan email pemulihan terlindungi.

Waspadai pesan yang meminta data pribadi, kode OTP, PIN, atau kata sandi. Jangan mengirimkan dokumen identitas melalui tautan yang diterima secara tiba-tiba. Buka aplikasi atau situs resmi secara langsung untuk memeriksa permintaan. Saat mengisi formulir, berikan hanya informasi yang benar-benar dibutuhkan dan pastikan penerima serta tujuannya jelas.

## Mencari dan menghapus informasi yang sudah terlanjur tersebar

Cari nama lengkap, nama pengguna, atau alamat email Anda di mesin pencari untuk mengetahui informasi yang tampak publik. Hasil pencarian hanya menunjukkan sebagian dari internet dan tidak menjamin semua data telah ditemukan. Jika ada halaman yang memuat informasi pribadi, hubungi pengelola situs untuk meminta penghapusan atau koreksi.

Menghapus hasil dari mesin pencari tidak selalu menghapus halaman sumbernya. Jika halaman asli masih tersedia, informasi dapat muncul kembali atau ditemukan melalui cara lain. Untuk data sensitif seperti dokumen identitas, informasi keuangan, atau alamat tempat tinggal, gunakan kanal resmi penyedia layanan atau situs untuk mengajukan permintaan, dan laporkan bila ada indikasi penyalahgunaan.

## Rencana sederhana selama satu minggu

Anda tidak harus menyelesaikan semuanya sekaligus. Coba lakukan satu langkah kecil setiap hari:

1. **Hari pertama:** periksa akun email utama dan aktifkan perlindungan login yang lebih kuat.
2. **Hari kedua:** tinjau profil publik dan sembunyikan informasi yang tidak perlu.
3. **Hari ketiga:** periksa izin lokasi, kamera, mikrofon, dan kontak di ponsel.
4. **Hari keempat:** putuskan koneksi aplikasi pihak ketiga yang sudah tidak digunakan.
5. **Hari kelima:** cari akun lama dan tutup akun yang tidak lagi dibutuhkan.
6. **Hari keenam:** tinjau unggahan lama dan hapus informasi sensitif yang tidak perlu tersedia.
7. **Hari ketujuh:** periksa pengaturan privasi browser dan personalisasi di layanan utama.

## Privasi adalah kebiasaan, bukan proyek sekali selesai

Pengaturan aplikasi dapat berubah, layanan baru akan digunakan, dan kebutuhan kita juga berganti. Jadwalkan pemeriksaan berkala, misalnya setiap beberapa bulan atau ketika memasang aplikasi baru. Ajarkan pula keluarga—terutama anak dan orang lanjut usia—untuk berhati-hati membagikan informasi serta mengenali permintaan yang mencurigakan.

Mengurangi jejak digital bukan soal menghilang dari internet. Ini tentang mengurangi paparan yang tidak perlu, menjaga kendali atas akun, dan memahami konsekuensi sebelum membagikan data. Mulai dari satu akun atau satu pengaturan hari ini; langkah kecil yang konsisten dapat membuat informasi pribadi lebih terlindungi dari waktu ke waktu.`,
  category: "Keamanan Siber",
  tags: ["Privasi Digital", "Jejak Digital", "Data Pribadi", "Keamanan Siber", "Literasi Digital"],
  cover: "default",
  author: "LKTech",
  status: "published",
  publishedAt: "2026-10-26T08:00:00.000Z",
};

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

async function main() {
  const ref = db.collection("articles").doc(article.slug);
  const existed = (await ref.get()).exists;
  await ref.set(
    {
      ...article,
      updatedAtISO: new Date().toISOString(),
      updatedBy: "seed-script",
    },
    { merge: true },
  );
  console.log(`✓ Artikel ${existed ? "diperbarui" : "dibuat"}: ${article.title}`);
}

main().catch((error) => {
  console.error("✗ Gagal seed artikel:", error);
  process.exit(1);
});
