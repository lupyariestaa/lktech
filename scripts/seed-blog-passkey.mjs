/**
 * Seed artikel blog LKTech tentang passkey.
 * Jalankan dari root project: node scripts/seed-blog-passkey.mjs
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
  slug: "passkey-login-tanpa-password",
  title: "Selamat Tinggal Password? Mengenal Passkey dan Cara Login yang Lebih Aman",
  excerpt:
    "Passkey menawarkan cara masuk akun tanpa mengetik kata sandi. Kenali cara kerjanya, kelebihan dan batasannya, serta langkah menggunakannya dengan aman.",
  body: `Kata sandi sudah lama menjadi kunci utama untuk masuk ke akun digital. Namun, kebiasaan menggunakan kata sandi yang sama di banyak layanan, memilih kombinasi yang mudah ditebak, atau memasukkannya ke halaman palsu membuat akun rentan dibajak. Passkey hadir sebagai alternatif yang dapat membuat proses login lebih sederhana sekaligus mengurangi sejumlah risiko tersebut.

Passkey bukan sekadar kata sandi yang disimpan di ponsel. Ia menggunakan kriptografi kunci publik: perangkat membuat sepasang kunci yang saling terkait. Kunci privat disimpan dengan perlindungan di perangkat atau pengelola kredensial, sedangkan layanan menyimpan kunci publik untuk memeriksa bahwa permintaan login benar-benar berasal dari pemilik akun.

## Bagaimana passkey bekerja?

Saat mendaftar, perangkat membuat kredensial khusus untuk akun dan layanan tersebut. Ketika pengguna ingin masuk, layanan mengirim tantangan digital. Perangkat kemudian membuktikan kepemilikan kunci privat dan pengguna menyetujui tindakan itu, biasanya dengan sidik jari, pengenalan wajah, PIN perangkat, atau metode buka kunci lain.

Data biometrik tidak dikirim kepada situs sebagai bagian dari proses login. Biometrik digunakan secara lokal oleh perangkat untuk membuka atau menyetujui penggunaan passkey. Situs menerima bukti kriptografis, bukan salinan sidik jari atau wajah pengguna.

Passkey juga terikat pada layanan atau domain tempat passkey dibuat. Karena itu, jika pengguna membuka situs tiruan dengan alamat yang berbeda, autentikator umumnya tidak akan menawarkan passkey untuk situs asli. Ini membantu mengurangi risiko phishing, meskipun pengguna tetap perlu waspada terhadap penipuan, perangkat yang terinfeksi, dan dukungan akun yang lemah.

## Bedanya dengan kata sandi dan OTP

Kata sandi adalah rahasia yang diketik dan dikirim untuk diperiksa oleh layanan. Jika kata sandi digunakan ulang lalu bocor dari satu layanan, pelaku mungkin mencoba kombinasi yang sama di layanan lain. Passkey menggunakan pasangan kunci unik untuk tiap layanan, sehingga tidak ada kata sandi yang perlu diingat atau diketik saat login.

Kode sekali pakai atau OTP biasanya menjadi lapisan verifikasi tambahan. Kode ini tetap dapat diminta atau dicuri melalui rekayasa sosial, misalnya ketika korban tertipu untuk membacakannya kepada penipu. Passkey mengubah prosesnya: alih-alih membagikan kode rahasia, perangkat menandatangani tantangan yang dikirim layanan.

> **Penting:** passkey dapat mengurangi beberapa risiko login, tetapi tidak otomatis melindungi seluruh akun. Email pemulihan, nomor telepon, sesi yang sudah aktif, dan proses pemulihan akun tetap perlu diamankan.

## Kelebihan passkey

### Lebih tahan terhadap phishing

Passkey dibuat untuk layanan tertentu dan pemeriksaan login terkait dengan domain. Ini membuat passkey lebih sulit digunakan pada situs tiruan dibanding kata sandi yang dapat diketik di mana saja.

### Tidak perlu mengingat banyak kata sandi

Pengguna dapat menyetujui login dengan metode buka kunci yang biasa dipakai. Tidak perlu mengingat kombinasi panjang untuk setiap akun, atau membuat kata sandi baru setiap kali lupa.

### Kredensial berbeda untuk setiap layanan

Passkey tidak dipakai ulang seperti kata sandi yang sama. Jika satu layanan mengalami masalah keamanan, kredensial untuk layanan lain tidak serta-merta menjadi sama.

### Login bisa terasa lebih cepat

Setelah passkey disiapkan, pengguna biasanya cukup memilih akun lalu menyetujui permintaan di perangkat. Pengalaman persisnya berbeda menurut layanan, sistem operasi, browser, dan pengelola kredensial yang digunakan.

## Hal yang perlu dipahami sebelum beralih

Passkey bergantung pada perangkat dan sistem pemulihan yang digunakan. Jika ponsel hilang atau rusak, pengguna perlu memiliki cara untuk mendapatkan kembali akses—misalnya sinkronisasi kredensial yang aman, perangkat lain yang sudah terdaftar, atau proses pemulihan resmi dari layanan.

Sinkronisasi passkey antarperangkat bergantung pada penyedia ekosistem yang dipilih. Pengguna sebaiknya memahami akun apa yang mengelola kredensial tersebut dan melindungi akun pengelola itu dengan baik. Untuk akun penting, jangan mengandalkan satu perangkat sebagai satu-satunya jalan masuk.

Tidak semua layanan mendukung passkey, dan sebagian masih meminta kata sandi atau metode pemulihan sebagai cadangan. Karena penerapan dan pilihan pemulihan berbeda antar layanan, periksa petunjuk resmi sebelum menghapus atau menonaktifkan metode login lama.

## Cara mulai menggunakan passkey

1. **Periksa pengaturan keamanan akun.** Cari menu seperti “Passkey”, “Kunci sandi”, atau “Login tanpa kata sandi”. Pastikan Anda berada di aplikasi atau situs resmi.
2. **Pilih perangkat atau pengelola kredensial tepercaya.** Ikuti instruksi layanan untuk membuat passkey dan konfirmasi dengan kunci layar, PIN, atau biometrik.
3. **Siapkan pemulihan akun.** Pastikan email dan nomor pemulihan masih dapat diakses, perbarui informasi cadangan, dan simpan kode pemulihan bila layanan menyediakannya.
4. **Tambahkan metode cadangan bila tersedia.** Untuk akun penting, pertimbangkan mendaftarkan perangkat kedua atau metode pemulihan resmi lain.
5. **Uji sebelum bergantung sepenuhnya.** Coba masuk dari perangkat yang biasa digunakan dan pastikan Anda mengerti cara mengakses akun jika perangkat utama tidak tersedia.

## Jika ponsel hilang

Gunakan fitur resmi untuk mengunci atau menghapus perangkat dari jarak jauh jika tersedia. Amankan akun yang menyinkronkan kredensial, cabut sesi yang tidak dikenal, dan ikuti prosedur pemulihan dari layanan. Jangan mengikuti tautan pemulihan yang dikirim orang tak dikenal; buka aplikasi atau situs resmi secara langsung.

Jika passkey tersinkron melalui sebuah akun utama, akun tersebut menjadi sangat penting. Lindungi dengan metode verifikasi yang kuat, pantau notifikasi keamanan, dan pastikan informasi pemulihannya mutakhir. Untuk perangkat kerja, hubungi administrator organisasi agar akses dapat dicabut atau dipulihkan dengan benar.

## Apakah passkey berarti password akan langsung hilang?

Belum tentu. Peralihan berlangsung bertahap karena dukungan layanan dan perangkat tidak seragam. Sebagian akun memungkinkan passkey menjadi metode utama, sementara yang lain masih meminta kata sandi atau OTP dalam situasi tertentu. Pengguna juga mungkin tetap membutuhkan kata sandi untuk pemulihan atau untuk layanan yang belum mendukung passkey.

Langkah yang masuk akal adalah mengaktifkan passkey pada layanan tepercaya yang sudah mendukungnya, sambil tetap menjaga keamanan akun pemulihan. Gunakan pengelola kata sandi untuk akun yang masih memerlukan kata sandi, aktifkan autentikasi tambahan bila tersedia, dan jangan membagikan kode rahasia kepada siapa pun.

Passkey bukan solusi ajaib, tetapi merupakan kemajuan penting dalam cara mengautentikasi pengguna. Dengan memahami cara kerjanya dan menyiapkan pemulihan yang baik, kita bisa mendapatkan proses login yang lebih praktis tanpa mengabaikan keamanan akun.`,
  category: "Keamanan Siber",
  tags: ["Passkey", "Keamanan Siber", "Password", "Privasi", "Autentikasi"],
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
