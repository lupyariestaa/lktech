/**
 * Seed artikel blog LKTech.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-articles.mjs
 *
 * Mendukung operasi idempoten: menjalankan ulang MENIMPA dokumen artikel yang
 * sama (articles/<slug>). Aman diulang.
 *
 * Menulis 9 artikel (3 lama + 6 baru):
 *   1. "Gemini AI & Bisnis: Cara Cerdas Memanfaatkan Kecerdasan Buatan"
 *   2. "AI untuk UMKM: 10 Pekerjaan yang Bisa Diotomatiskan Hari Ini"
 *   3. "Masa Depan Web: 5 Perubahan Besar & Kenapa Bisnis Anda Harus Bersiap"
 *   4. "Cara Memilih Jasa Pembuatan Website: 9 Pertanyaan Sebelum Bayar"
 *   5. "Toko Online vs Landing Page: Mana yang Bisnis Anda Butuhkan?"
 *   6. "SEO Lokal untuk UMKM: Cara Muncul di Pencarian Kota Anda"
 *   7. "7 Tren Web & Aplikasi 2026 yang Wajib Disiapkan Bisnis"
 *   8. "Studi Kasus: Dari Katalog Manual ke Toko Online, Omzet Naik"
 *   9. "Checklist Lengkap Sebelum Meluncurkan Website Bisnis (2026)"
 *
 * Gambar sampul (coverImage) SENGAJA dikosongkan — silakan atur lewat
 * /admin/blog (tab Sampul) agar memakai gambar pilihan Anda.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ */
/* 1. Muat .env.local                                                    */
/* ------------------------------------------------------------------ */
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
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
).trim();

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "✗ Kredensial Firebase Admin tidak lengkap (.env.local: FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).",
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 2. Data artikel                                                       */
/* ------------------------------------------------------------------ */
const ARTICLES = [
  {
    slug: "gemini-ai-untuk-bisnis",
    title: "Gemini AI untuk Bisnis: Cara Cerdas Memanfaatkan Kecerdasan Buatan",
    excerpt:
      "AI bukan lagi barang mewah milik perusahaan besar. Dengan Gemini, bisnis kecil pun bisa menghemat waktu, menekan biaya, dan mengambil keputusan lebih cepat. Ini cara memulainya.",
    body: `Kecerdasan buatan (AI) dulu terdengar seperti teknologi masa depan yang mahal dan rumit. Sekarang? Cukup buka browser, dan Anda bisa "mempekerjakan" asisten yang menulis, meringkas, menganalisis, dan menjawab pertanyaan pelanggan — selama 24 jam, tanpa cuti.

Salah satu yang paling cepat berkembang adalah **Gemini**, model AI dari Google. Ia dirancang untuk memahami teks, gambar, suara, hingga video sekaligus — kemampuan yang disebut *multimodal*.

## Apa yang membuat Gemini berbeda?

Sebagian besar chatbot hanya memahami teks. Gemini memahami banyak "bahasa" sekaligus:

- **Teks** — menulis, meringkas, menerjemahkan, menjawab pertanyaan.
- **Gambar** — membaca foto produk, nota, atau dokumen lalu menjelaskannya.
- **Suara** — memahami instruksi lisan.
- **Video** — menganalisis konten bergerak.

Artinya, Anda bisa mengunggah foto sebuah nota, dan AI langsung merapikannya menjadi catatan transaksi. Atau mengirim gambar desain, lalu meminta saran perbaikan.

## Kenapa bisnis perlu peduli?

### 1. Menghemat waktu yang selama ini habis untuk pekerjaan berulang

Menulis caption media sosial, membalas pertanyaan umum pelanggan, membuat ringkasan rapat — pekerjaan ini menyita jam setiap minggu. AI bisa menyelesaikan drafnya dalam hitungan detik, lalu Anda tinggal menyempurnakan.

### 2. Menekan biaya operasional

Daripada merekrut untuk tugas administratif berulang, Anda bisa mengotomatiskan sebagiannya. Uang yang dihemat bisa dialihkan ke hal yang benar-benar menumbuhkan bisnis: pemasaran, produk, atau layanan pelanggan.

### 3. Mengambil keputusan lebih cepat

AI bisa merangkum data penjualan, menyimpulkan tren, dan memberi saran. Keputusan yang dulu butuh rapat berjam-jam kini bisa dirumuskan lebih cepat.

## Cara memulai tanpa tergagap

Banyak pemilik bisnis gagal karena mencoba "mengadopsi AI" secara besar-besaran di awal. Mulailah kecil:

1. **Pilih satu tugas yang paling menyita waktu.** Misalnya: menjawab pertanyaan yang sama dari pelanggan berulang kali.
2. **Buat draf dengan AI, review hasilnya.** Jangan langsung percaya 100% — jadikan AI sebagai asisten, bukan pengganti penilaian Anda.
3. **Ukur dampaknya.** Berapa jam yang dihemat? Berapa pelanggan yang terlayani lebih cepat?
4. **Perluas ke tugas berikutnya** begitu satu proses berjalan lancar.

## Hal penting yang jangan dilupakan

AI itu **pintar, tapi tidak sempurna**. Ia bisa salah, berhalusinasi (memberi jawaban yang terdengar benar tetapi keliru), atau menghasilkan konten yang terlalu generik.

Kuncinya: **selalu ada manusia di ujungnya.** AI mempercepat, manusia memastikan kebenaran dan sentuhan personal. Bisnis yang berhasil dengan AI adalah yang memakai AI untuk **memperkuat** timnya, bukan menggantikan pertimbangan manusia.

---

Teknologi seperti Gemini membuka peluang besar bagi bisnis dari semua ukuran. Yang membedakan bukan seberapa canggih alatnya, tetapi seberapa cepat Anda mulai mencobanya dengan cara yang tepat.

Punya ide bagaimana AI bisa membantu bisnis Anda? **Diskusikan gratis dengan tim LKTech.**`,
    category: "Teknologi",
    tags: ["AI", "Gemini", "Kecerdasan Buatan", "Otomasi", "Produktivitas"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-03-05T08:00:00.000Z",
  },
  {
    slug: "ai-untuk-umkm-10-pekerjaan-otomatis",
    title: "AI untuk UMKM: 10 Pekerjaan yang Bisa Diotomatiskan Hari Ini",
    excerpt:
      "Anda tidak perlu jadi perusahaan teknologi untuk merasakan manfaat AI. Inilah 10 pekerjaan di UMKM yang bisa diotomatiskan sekarang — hemat waktu, hemat biaya.",
    body: `Banyak pelaku UMKM menganggap AI itu "urusannya perusahaan besar". Padahal, justru UMKM yang paling butuh — karena sumber daya terbatas, tetapi pekerjaan tidak pernah habis.

Berikut 10 pekerjaan yang bisa Anda otomatiskan dengan bantuan AI, bahkan tanpa tim IT.

## 1. Menjawab pertanyaan pelanggan yang berulang

"Berapa harganya?" "Apakah bisa kirim ke luar kota?" "Jam bukanya kapan?"

Chatbot AI bisa menjawab pertanyaan ini otomatis lewat WhatsApp atau website, sehingga Anda tidak perlu membalas satu per satu di tengah malam.

## 2. Menulis draf konten media sosial

Butuh caption untuk 30 hari ke depan? AI bisa membuat kalendernya dalam sekali permintaan. Anda tinggal mengedit agar sesuai gaya brand.

## 3. Membuat deskripsi produk

Unggah foto produk, dan AI bisa menuliskan deskripsi yang menarik dan ramah SEO untuk katalog toko online Anda.

## 4. Menyusun balasan ulasan

Rating buruk di marketplace? AI bisa membantu menyusun balasan yang sopan, empatik, dan profesional — dalam hitungan detik.

## 5. Merangkum laporan penjualan

Daripada membaca ratusan baris spreadsheet, minta AI merangkum: mana produk terlaris, tren minggu ini, dan apa yang perlu diperhatikan.

## 6. Membuat gambar untuk promosi

AI generatif bisa membuat gambar latar, banner, dan materi promosi — tanpa perlu membeli stok foto atau menyewa desainer untuk setiap kebutuhan kecil.

## 7. Menerjemahkan dokumen

Mau menjangkau pelanggan asing? AI bisa menerjemahkan brosur, halaman website, atau katalog dengan cepat (tetap perlu review manusia untuk nuansa).

## 8. Menyusun draf email & penawaran

Kirim penawaran ke klien? AI bisa membuat draf profesional yang siap Anda kirim dalam sekejap.

## 9. Membuat ringkasan pertemuan

Rekam rapat dengan klien, lalu minta AI merangkum poin-poin penting dan daftar tindak lanjutnya.

## 10. Membuat ide konten

Kebuntuan ide? AI bisa memberi puluhan topik konten relevan untuk bisnis Anda hanya dari satu deskripsi singkat.

## Ingat aturan emasnya

> **AI membuat draf, Anda yang memutuskan.**

Setiap hasil AI sebaiknya melewati mata manusia sebelum dipublikasikan. Ini memastikan tidak ada fakta keliru dan tetap ada sentuhan personal yang membuat bisnis Anda berbeda.

## Dari mana mulai?

Pilih **satu** pekerjaan di atas yang paling sering menghabiskan waktu Anda. Otomatiskan itu dulu, rasakan manfaatnya, baru lanjut ke yang lain.

Jangan mencoba semuanya sekaligus — itu cara tercepat untuk menyerah di tengah jalan.

---

Ingin mengintegrasikan AI ke dalam alur kerja bisnis Anda — misalnya chatbot pelanggan atau otomasi katalog? **Tim LKTech siap membantu.** Konsultasi gratis, tanpa komitmen.`,
    category: "Bisnis Digital",
    tags: ["AI", "UMKM", "Otomasi", "Produktivitas", "UMKM Digital"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-03-12T08:00:00.000Z",
  },
  {
    slug: "masa-depan-web-bisnis-siap-sekarang",
    title: "Masa Depan Web: 5 Perubahan Besar & Kenapa Bisnis Anda Harus Bersiap",
    excerpt:
      "Web terus berevolusi dengan cepat. Dari AI yang memahami gambar sampai pencarian yang digerakkan jawaban, ini 5 perubahan besar yang akan menentukan bisnis Anda.",
    body: `Media digital bergerak lebih cepat dari sebelumnya. Teknologi yang dua tahun lalu terdengar mustahil, kini sudah dipakai sehari-hari. Pertanyaan pentingnya bukan *apakah* website Anda perlu berubah, tetapi *seberapa siap* Anda menghadapinya.

Ini lima perubahan besar yang sedang membentuk masa depan web — dan apa artinya bagi bisnis Anda.

## 1. Pencarian kini digerakkan AI, bukan hanya kata kunci

Dulu orang mengetik "jasa website murah" lalu memilih satu dari sepuluh tautan. Sekarang, mesin pencari dan chatbot AI **langsung memberi jawaban**.

**Apa artinya:** konten yang jelas, terstruktur, dan menjawab pertanyaan spesifik akan jauh lebih diuntungkan. Website yang hanya berisi kata kunci tanpa isi bermakna akan tersisih.

## 2. AI memahami gambar & video

Pencarian multimodal memungkinkan orang mencari dengan gambar. Unggah foto sebuah produk, dan AI bisa menjelaskan atau menemukan hal serupa.

**Apa artinya:** teks alternatif (alt text) yang baik, judul gambar yang jelas, dan deskripsi produk yang deskriptif jadi lebih penting dari sebelumnya — bukan sekadar formalitas.

## 3. Kecepatan menjadi faktor penentu

Pengguna modern tidak sabar. Setiap 1 detik keterlambatan memuat bisa menurunkan konversi secara nyata. Mesin pencari pun mengutamakan situs yang cepat.

**Apa artinya:** website yang berat dan lambat akan kalah — bukan hanya di peringkat pencarian, tapi di mata pelanggan.

## 4. Personalisasi makin canggih

Website masa depan semakin pintar menyesuaikan diri: menampilkan rekomendasi relevan, menyapa dengan konteks, dan memberi pengalaman yang berbeda untuk tiap pengunjung.

**Apa artinya:** struktur data yang rapi dan sistem yang fleksibel jadi fondasi penting. Website statis kaku akan semakin tertinggal.

## 5. Chatbot & asisten jadi bagian standar

Sudah lazim pengunjung berbicara langsung dengan asisten AI di sebuah website — untuk bertanya, membandingkan, hingga memesan. Ini melayani pelanggan tanpa menambah beban tim.

**Apa artinya:** menyediakan jalur komunikasi cepat (WhatsApp, chat AI, form pintar) bukan lagi kemewahan, melainkan standar.

## Kenapa Anda harus bersiap **sekarang**, bukan nanti?

Karena setiap perubahan di atas menumpuk seperti bunga majemuk. Website yang dibangun dengan fondasi baik hari ini akan jauh lebih mudah beradaptasi esok — sementara situs usang akan makin mahal untuk diperbaiki.

Yang perlu Anda pastikan:

1. **Struktur yang rapi** — agar mudah dikembangkan kapan saja.
2. **Kecepatan & SEO** — fondasi yang tak akan pernah kedaluwarsa.
3. **Fleksibilitas** — mudah menambah fitur (chatbot, pembayaran, AI) tanpa membangun ulang dari nol.
4. **Keamanan** — karena data pelanggan adalah aset.

## Penutup

Teknologi web sedang bergeser dari "halaman yang dilihat" menjadi "sistem yang memahami dan melayani". Bisnis yang menyiapkan fondasinya sekarang akan menuai hasilnya saat gelombang berikutnya tiba.

---

Website Anda sudah siap menghadapi masa depan? **Konsultasikan gratis dengan LKTech** — kami bantu memastikan fondasi digital bisnis Anda kokoh dan siap bertumbuh.`,
    category: "Tips & Trik",
    tags: ["Web Development", "Tren Teknologi", "SEO", "AI", "Bisnis Digital"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-03-20T08:00:00.000Z",
  },

  /* ===================== 6 ARTIKEL BARU (2026) ===================== */

  {
    slug: "cara-memilih-jasa-pembuatan-website",
    title: "Cara Memilih Jasa Pembuatan Website: 9 Pertanyaan Sebelum Bayar",
    excerpt:
      "Salah pilih vendor website bisa berujung pada situs lambat, biaya tersembunyi, dan proyek mangkrak. Ajukan 9 pertanyaan ini sebelum Anda membayar sepeser pun.",
    body: `Membuat website itu mudah. Membuat website yang **benar** — cepat, aman, mudah dikelola, dan benar-benar mendatangkan pelanggan — itu yang butuh kejelasan. Masalahnya, hampir semua penyedia jasa mengaku bisa melakukan segalanya.

Bagaimana membedakan yang profesional dari yang sekadar menawarkan harga murah? Ajukan sembilan pertanyaan berikut. Jawaban mereka akan membuka banyak hal.

## 1. Apa yang saya miliki setelah proyek selesai?

Ini pertanyaan paling penting. Tanyakan secara spesifik:

- Apakah saya mendapat **kode sumber** atau hanya akses ke dashboard mereka?
- Apakah **domain dan hosting** terdaftar atas nama saya, atau atas nama vendor?
- Bisakah saya pindah vendor lain kapan saja tanpa kehilangan data?

Vendor yang sehat tidak akan mengunci Anda. Kalau jawabannya berbelit soal kepemilikan, waspadalah.

## 2. Berapa biaya total — termasuk yang tersembunyi?

Harga awal sering bukan harga akhir. Mintalah rincian yang mencakup:

- Biaya domain & hosting per tahun.
- Biaya pembaruan atau pemeliharaan berkala.
- Apakah revisi dibatasi? Berapa kali?
- Apakah ada biaya tambahan untuk menambah halaman atau fitur?

Pilih yang **transparan** daripada yang termurah.

## 3. Apakah website ramah SEO dan cepat?

Website yang indah tapi lambat dan tidak terindeks mesin pencari hanyalah pajangan. Tanyakan:

- Apakah strukturnya ramah SEO (judul, deskripsi, sitemap, data terstruktur)?
- Bagaimana skor kecepatannya (Core Web Vitals)?

## 4. Bagaimana tampilannya di ponsel?

Lebih dari separuh pengunjung datang dari ponsel. Website yang "bisa dibuka" di ponsel berbeda dengan website yang **dirancang** untuk ponsel. Pastikan mobile-first.

## 5. Apakah mudah saya kelola sendiri?

Anda seharusnya bisa mengganti teks, gambar, dan menambah artikel tanpa menghubungi vendor setiap kali. Tanyakan apakah ada panel admin yang ramah pengguna.

## 6. Bagaimana keamanannya?

Situs yang diretas merusak reputasi. Tanyakan soal sertifikat SSL (HTTPS), pembaruan keamanan, dan pencadangan (backup) berkala.

## 7. Berapa lama pengerjaannya?

Mintalah **linimasa yang realistis** — bukan janji "beres besok". Proyek yang wajar biasanya punya tahap: diskusi, desain, pengembangan, uji, lalu rilis.

## 8. Boleh lihat portofolio nyata (bukan sekadar gambar)?

Minta tautan **situs yang benar-benar berjalan** dan dapat Anda buka sendiri. Bukan mockup, bukan screenshot.

## 9. Bagaimana dukungan setelah rilis?

Website bukan proyek sekali jadi. Tanyakan apakah ada dukungan bila terjadi error, dan berapa lama responsnya.

## Ringkasan cepat

> Vendor yang baik **senang** menjawab pertanyaan-pertanyaan ini dengan jelas. Yang menghindar, biasanya punya alasan untuk menghindar.

Kalau Anda menemukan jasa yang transparan soal kepemilikan, biaya, dan dukungan — Anda sudah menemukan kandidat serius. Sisanya tinggal soal kecocokan selera dan anggaran.

---

Sedang membandingkan beberapa vendor untuk website bisnis Anda? **Konsultasi gratis dengan LKTech** — kami akan menjawab sembilan pertanyaan di atas secara terbuka, tanpa komitmen.`,
    category: "Panduan",
    tags: ["Jasa Website", "Tips Memilih Vendor", "Website Bisnis", "Panduan"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-03-28T08:00:00.000Z",
  },
  {
    slug: "toko-online-vs-landing-page",
    title: "Toko Online vs Landing Page: Mana yang Bisnis Anda Butuhkan?",
    excerpt:
      "Bingung mau bangun toko online lengkap atau landing page sederhana lebih dulu? Jawabannya bergantung pada satu hal: perilaku pembeli Anda.",
    body: `Salah satu keputusan pertama saat bisnis Anda go-digital adalah: **mau bikin toko online atau landing page?** Keduanya sama-sama "website", tapi tujuan, biaya, dan cara kerjanya sangat berbeda.

Salah memilih bisa membuat Anda membuang anggaran untuk fitur yang tak terpakai — atau justru kurang fitur saat pembeli butuh.

## Apa itu landing page?

**Landing page** adalah satu halaman yang fokus pada **satu tujuan** — biasanya agar pengunjung menghubungi Anda, mengisi formulir, atau mengklik WhatsApp.

Cocok untuk:

- Layanan yang butuh konsultasi dulu (jasa desain, konsultan, kontraktor).
- Promo produk tunggal atau peluncuran.
- Bisnis yang baru mulai dan ingin validasi cepat.

Keunggulannya: **cepat dibuat, murah, dan fokus**. Pengunjung diarahkan ke satu aksi tanpa distraksi.

## Apa itu toko online?

**Toko online** memiliki katalog produk, keranjang, checkout, dan pembayaran otomatis. Pembeli bisa menjelajah dan membeli tanpa Anda harus membalas chat satu per satu.

Cocok untuk:

- Produk dengan harga jelas dan stok banyak.
- Barang yang bisa dikirim (produk fisik, digital, template).
- Bisnis yang ingin **menjual 24 jam** tanpa intervensi manual.

## Jadi, mana yang Anda butuhkan?

Jawab pertanyaan ini dulu:

> **Apakah pembeli Anda sudah tahu apa yang ingin dibeli, atau perlu diyakinkan dulu?**

- Kalau pembeli **perlu diyakinkan** (jasa, proyek custom, harga menyesuaikan) → **landing page** dulu.
- Kalau pembeli **sudah tahu produknya** dan tinggal beli → **toko online** lebih efektif.

## Bisa dimulai kecil, kok

Anda tidak harus memilih selamanya. Banyak bisnis tumbuh bertahap:

1. **Mulai dengan landing page** untuk memperkenalkan layanan & menangkap kontak.
2. Saat permintaan stabil, **tambahkan toko online** untuk produk yang siap dibeli langsung.

Dengan struktur yang tepat sejak awal, menambah toko online di kemudian hari tidak perlu membangun ulang dari nol.

## Yang paling sering salah

- **Bikin toko online untuk jasa custom** → pembeli bingung karena harga tak bisa dipatok, akhirnya tak jadi beli.
- **Bikin landing page untuk katalog produk 50 item** → pengunjung capek, tak bisa membandingkan, lalu kabur ke kompetitor.

## Penutup

Tidak ada jawaban yang "paling benar". Yang benar adalah yang **cocok dengan cara pembeli Anda mengambil keputusan**.

Kalau masih ragu, mulailah dari yang paling sederhana yang bisa menguji pasar — biasanya landing page — lalu berkembang sesuai kebutuhan.

---

Butuh bantuan memutuskan dan membangun yang tepat? **LKTech** membantu bisnis merancang struktur digital yang sesuai tahap pertumbuhan mereka. Konsultasi gratis.`,
    category: "Bisnis Digital",
    tags: ["Toko Online", "Landing Page", "E-commerce", "Strategi Digital"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-04-05T08:00:00.000Z",
  },
  {
    slug: "seo-lokal-umkm-muncul-di-pencarian-kota",
    title: "SEO Lokal untuk UMKM: Cara Muncul di Pencarian Kota Anda",
    excerpt:
      "Pelanggan di kota Anda sedang mencari jasa/produk Anda di Google — dan mereka menemukan kompetitor. Ini cara membuat bisnis Anda muncul lebih dulu.",
    body: `Ada pertanyaan yang sering muncul dari pelaku UMKM: *"Kenapa pesaing saya muncul di Google padahal usahanya baru, sedangkan saya sudah lama buka?"*

Salah satu jawabannya: **pesaing itu mengerjakan SEO lokal**, dan Anda belum. Kabar baiknya — SEO lokal tidak sesulit yang dibayangkan.

## Apa itu SEO lokal?

SEO lokal adalah upaya agar bisnis Anda muncul saat orang mencari sesuatu **di sekitar lokasi Anda** — misalnya "jasa las terdekat" atau "katering Tasikmalaya".

Pengunjungnya sedikit, tapi **niatnya tinggi**. Orang yang mencari "jasa website di kota saya" jauh lebih mungkin menghubungi Anda dibanding pengunjung acak.

## Langkah 1: Pastikan bisnis Anda terdaftar di Google

Buat **Google Business Profile** (Profil Bisnis Google) gratis:

- Isi nama, alamat, jam buka, dan nomor telepon.
- Tambahkan foto asli (toko, produk, tim).
- Minta pelanggan lama memberi ulasan.

Profil ini yang membuat bisnis Anda muncul di peta dan hasil pencarian lokal.

## Langkah 2: Tulis halaman yang menyebut kota Anda

Google perlu tahu bahwa Anda melayani area tertentu. Sebutkan **kota dan wilayah** Anda secara alami di:

- Halaman utama dan halaman layanan.
- Judul dan deskripsi halaman.
- Konten yang benar-benar relevan (bukan sekadar tempelan nama kota).

Hindari mengulang nama kota berlebihan — tulis seperti manusia, bukan robot.

## Langkah 3: Kumpulkan ulasan jujur

Ulasan adalah bahan bakar SEO lokal. Ulasan positif:

- Meningkatkan kepercayaan calon pelanggan.
- Membantu peringkat di hasil pencarian lokal.

Cara sopan: setelah transaksi selesai, minta pelanggan memberi ulasan lewat tautan singkat. **Jangan** membeli ulasan palsu — risikonya besar.

## Langkah 4: Konsisten di semua kanal

Pastikan **nama, alamat, dan nomor telepon yang sama** muncul konsisten di website, media sosial, dan direktori bisnis. Ketidakkonsistenan membingungkan Google.

## Langkah 5: Buat konten yang menjawab pertanyaan lokal

Tulis artikel atau halaman yang menjawab pertanyaan khas orang di kota Anda, misalnya:

- "Berapa biaya jasa X di [kota]?"
- "Rekomendasi [produk] terbaik di [kota]"

Konten seperti ini menangkap pencarian berniat tinggi sekaligus membangun otoritas.

## Kesalahan yang harus dihindari

- **Mengisi kota ke banyak halaman secara asal** tanpa nilai tambah → dianggap spam.
- **Mengabaikan ponsel** → mayoritas pencarian lokal dilakukan dari ponsel.
- **Website lambat** → pengunjung kabur sebelum melihat penawaran Anda.

## Dari mana mulai?

Kalau hanya boleh lakukan **satu** hal minggu ini: buat dan lengkapi **Google Business Profile** bisnis Anda. Itu langkah tunggal dengan dampak terbesar.

Setelah itu, rapikan halaman website agar menyebut layanan dan area Anda dengan jelas.

---

Ingin website bisnis Anda muncul saat orang mencari di kota Anda? **LKTech** membantu UMKM membangun fondasi digital yang ramah SEO lokal. Konsultasi gratis, tanpa komitmen.`,
    category: "Bisnis Digital",
    tags: ["SEO", "SEO Lokal", "UMKM", "Pemasaran Digital", "Google"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-04-15T08:00:00.000Z",
  },
  {
    slug: "tren-web-aplikasi-2026",
    title: "7 Tren Web & Aplikasi 2026 yang Wajib Disiapkan Bisnis",
    excerpt:
      "Dari pengalaman yang dipersonalisasi sampai aplikasi yang bisa 'diinstal' dari browser — ini 7 tren 2026 dan cara bisnis Anda memanfaatkannya.",
    body: `Tren teknologi bukan sekadar bahan obrolan. Bagi bisnis, tren adalah **sinyal tentang ke mana pelanggan akan pergi** — dan seberapa mahal biaya mengejar ketertinggalan.

Ini tujuh tren web & aplikasi 2026 yang paling layak diperhatikan, dari yang paling praktis hingga yang paling transformatif.

## 1. Pengalaman yang dipersonalisasi

Website makin pintar menyesuaikan diri: menampilkan rekomendasi relevan, menyapa sesuai konteks, dan menyusun pengalaman berbeda untuk tiap pengunjung.

**Untuk bisnis Anda:** struktur data yang rapi dan sistem fleksibel jadi fondasi. Situs kaku akan tertinggal.

## 2. PWA — aplikasi yang "diinstal" dari browser

**Progressive Web App (PWA)** membuat website bisa dipasang di layar utama ponsel seperti aplikasi — tanpa perlu diunduh dari toko aplikasi.

Keuntungannya: lebih cepat, bisa diakses offline ringan, dan menghilangkan hambatan "harus download dulu".

**Untuk bisnis Anda:** pengalaman ala aplikasi tanpa biaya pengembangan aplikasi penuh.

## 3. AI yang tertanam di dalam produk

Bukan lagi chatbot tempelan — AI mulai tertanam di dalam alur kerja: membantu menulis, meringkas, merekomendasikan, dan menjawab.

**Untuk bisnis Anda:** pikirkan satu titik gesekan di layanan Anda yang bisa dihaluskan AI (misalnya menjawab pertanyaan umum).

## 4. Notifikasi yang relevan (bukan spam)

Push notification dan pesan otomatis makin cerdas mengirim **hanya pada momen yang tepat** — saat stok tersedia kembali, saat harga turun, saat pesanan siap.

**Untuk bisnis Anda:** kanal kembali ke pelanggan jadi aset, bukan gangguan.

## 5. Pembayaran yang makin mulus

QRIS, e-wallet, dan pembayaran otomatis membuat checkout makin sedikit langkah. Friksi berkurang, konversi naik.

**Untuk bisnis Anda:** kalau belum menerima pembayaran online, 2026 waktu yang tepat untuk mulai.

## 6. Kecepatan & Core Web Vitals sebagai standar

Pengguna makin tidak sabar, dan mesin pencari makin tegas soal kecepatan. Situs lambat kalah di peringkat **dan** di mata pelanggan.

**Untuk bisnis Anda:** optimasi performa bukan proyek sekali jadi — jadikan kebiasaan.

## 7. Fokus pada privasi & kepercayaan

Regulasi dan ekspektasi pengguna makin ketat soal data. Transparansi soal apa yang Anda simpankan dan mengapa menjadi pembeda.

**Untuk bisnis Anda:** jangan kumpulkan data yang tak Anda butuhkan; jelaskan kebijakan dengan bahasa manusia.

## Bagaimana menyikapinya tanpa panik?

Anda tidak perlu mengejar semua tren sekaligus. Yang penting: **bangun fondasi yang fleksibel.**

- **Struktur rapi** — mudah dikembangkan kapan saja.
- **Kecepatan & SEO** — fondasi yang tak kedaluwarsa.
- **Keamanan** — karena data pelanggan adalah aset.

Dengan fondasi ini, mengadopsi tren berikutnya (PWA, AI, notifikasi) menjadi penambahan, bukan pembangunan ulang.

## Penutup

Bisnis yang menyiapkan fondasinya hari ini akan jauh lebih murah beradaptasi esok. Yang menunda, akan membayar lebih mahal nanti — bukan hanya dalam uang, tapi dalam peluang yang hilang.

---

Mau memastikan website & sistem bisnis Anda siap menghadapi 2026? **Konsultasi gratis dengan LKTech** — kami bantu memetakan fondasi digital yang tepat untuk Anda.`,
    category: "Teknologi",
    tags: ["Tren Teknologi", "PWA", "AI", "Web Development", "2026"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-04-25T08:00:00.000Z",
  },
  {
    slug: "studi-kasus-toko-online-umkm-omzet-naik",
    title: "Studi Kasus: Dari Katalog Manual ke Toko Online, Omzet Naik",
    excerpt:
      "Sebuah UMKM mencatat pesanan di buku, membalas chat satu per satu, dan sering kehilangan pembeli. Setelah pindah ke toko online, inilah yang berubah.",
    body: `*Catatan: ini studi kasus ilustratif berdasarkan pola umum yang kami temui pada UMKM yang berpindah dari pencatatan manual ke sistem digital. Angka bersifat indikatif.*

## Kondisi awal: semua serba manual

Bayangkan sebuah UMKM yang menjual produk kerajinan. Masalahnya mirip dengan banyak usaha lain:

- Pesanan dicatat di **buku tulis**, kadang lupa, kadang salah hitung.
- Setiap pembeli harus **tanya harga lewat chat**, satu per satu.
- Kalau admin sedang tidur atau sibuk, **pembeli kabur** ke kompetitor.
- Tidak ada rekap penjualan; pemilik tidak tahu produk mana yang paling laku.

Hasilnya: potensi omzet yang hilang setiap hari, tanpa disadari.

## Keputusan: mulai dari yang paling terasa sakitnya

Alih-alih langsung "digitalisasi total", tim memilih satu masalah paling mengganggu: **pembeli sulit melihat produk & harga, dan pemesanan tak terekam.**

Solusinya: **toko online sederhana** dengan:

- Katalog produk dengan foto & harga jelas.
- Keranjang dan checkout yang bisa dilakukan kapan saja.
- Pembayaran otomatis sehingga pesanan terekam rapi.

## Yang berubah setelah 3 bulan

Hal-hal berikut umumnya mulai terasa:

### 1. Penjualan tidak lagi bergantung pada jam admin

Pembeli bisa memesan **kapan pun** — termasuk malam dan akhir pekan. Pesanan pagi sudah menunggu, bukan hilang.

### 2. Beban menjawab chat berkurang

Karena harga dan spesifikasi sudah jelas di halaman produk, pertanyaan berulang jauh berkurang. Admin fokus pada hal lain.

### 3. Data mulai berbicara

Toko online merekam **produk terlaris**, jam ramai, dan pelanggan yang sering kembali. Pemilik akhirnya bisa mengambil keputusan berbasis data, bukan perasaan.

### 4. Kepercayaan naik

Toko yang rapi, cepat, dan aman membuat pembeli lebih yakin — terutama pembeli dari luar kota yang belum pernah melihat toko fisiknya.

## Pelajaran yang bisa Anda ambil

- **Mulai dari satu titik paling sakit.** Tidak perlu sistem sempurna sekali jadi.
- **Jangan tunggu "siap sempurna".** Situs yang jalan dan terus diperbaiki mengalahkan rencana yang tak pernah selesai.
- **Data adalah bonus tak terduga.** Banyak pemilik baru sadar betapa berharganya data penjualan setelah memilikinya.

## Tantangan yang jujur

Digitalisasi bukan tanpa usaha:

- Perlu **foto produk yang layak** (bisa dilakukan bertahap).
- Perlu **kebiasaan baru** mengelola pesanan lewat sistem, bukan buku.
- Butuh waktu awal untuk **mengisi katalog**.

Tapi hambatan ini **sekali bayar**, sementara manfaatnya berjalan terus.

## Penutup

Kisah ini sederhana: masalah nyata, solusi tepat sasaran, hasil yang bertambah dari waktu ke waktu. Yang membedakan bukan teknologinya yang canggih, tetapi **keberanian memulai dari satu langkah konkret**.

---

Bisnis Anda sedang di tahap mana? Kalau pencatatan masih manual dan pembeli banyak yang hilang, mungkin saatnya mempertimbangkan toko online. **Konsultasi gratis dengan LKTech** untuk melihat apa yang paling masuk akal bagi usaha Anda.`,
    category: "Bisnis Digital",
    tags: ["Studi Kasus", "Toko Online", "UMKM", "E-commerce", "Pertumbuhan"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-05-05T08:00:00.000Z",
  },
  {
    slug: "checklist-sebelum-meluncurkan-website",
    title: "Checklist Lengkap Sebelum Meluncurkan Website Bisnis (2026)",
    excerpt:
      "Meluncurkan website bukan sekadar 'sudah jadi'. Sebelum tombol rilis ditekan, pastikan 24 poin ini sudah beres agar tidak ada yang terlewat.",
    body: `Website sudah hampir selesai. Pertanyaannya: **sudah benar-benar siap diluncurkan?**

Meluncurkan situs yang belum matang bisa merusak kesan pertama. Gunakan checklist ini sebelum menekan tombol rilis.

## A. Konten & Isi

- [ ] Semua teks sudah **bebas dari salah ketik** dan kalimat rancu.
- [ ] Tidak ada lagi teks contoh seperti *"Lorem ipsum"*.
- [ ] Nomor telepon, email, dan alamat **sudah benar**.
- [ ] Tanggal, harga, dan penawaran masih **aktual**.
- [ ] Semua tautan internal berfungsi (tidak ada tautan buntu).

## B. Tampilan & Pengalaman (UX)

- [ ] Tampilan rapi di **ponsel, tablet, dan desktop**.
- [ ] Tombol dan menu mudah ditekan di layar kecil.
- [ ] Warna kontras cukup (teks mudah dibaca).
- [ ] Formulir memberi umpan balik saat berhasil/gagal.

## C. Teknis & Performa

- [ ] Website **cepat** (halaman utama tampil di bawah ~2,5 detik).
- [ ] **HTTPS aktif** (gembok hijau) — bukan HTTP biasa.
- [ ] Gambar sudah **dioptimasi** (tidak menampilkan file 5 MB).
- [ ] Tidak ada halaman yang error atau tampil kosong.

## D. SEO & Visibilitas

- [ ] Setiap halaman punya **judul & deskripsi unik**.
- [ ] **Canonical** benar (tidak semua halaman menunjuk ke beranda).
- [ ] **Sitemap** dan **robots.txt** sudah benar.
- [ ] Halaman privat (admin, keranjang) **tidak terindeks**.
- [ ] Sudah didaftarkan di **Google Search Console**.

## E. Keamanan & Data

- [ ] **Pencadangan (backup)** otomatis aktif.
- [ ] Formulir terlindung dari **spam** (mis. captcha sederhana).
- [ ] Kebijakan privasi tersedia bila mengumpulkan data pengguna.

## F. Pelacakan & Analitik

- [ ] **Google Analytics** (atau alternatif) terpasang.
- [ ] Tombol WhatsApp/CRM tercatat sebagai **konversi**.
- [ ] Sudah tahu **metrik apa** yang akan dipantau minggu pertama.

## G. Peluncuran

- [ ] Domain mengarah ke situs baru.
- [ ] Sudah diuji membuka situs dari perangkat & jaringan berbeda.
- [ ] Ada **rencana siapa yang memantau** situs di hari-hari pertama.
- [ ] Konten peluncuran (posting media sosial / pesan ke pelanggan) sudah siap.

## Yang sering terlupakan

Dua hal paling sering terlewat: **canonical** (banyak situs keliru menunjuk semua halaman ke beranda) dan **halaman privat yang terindeks** (keranjang atau halaman test muncul di Google).

Sempatkan periksa keduanya sebelum rilis.

## Setelah rilis, bukan berarti selesai

Peluncuran adalah **awal**, bukan akhir. Minggu pertama, pantau:

- Halaman mana yang paling dikunjungi.
- Di mana pengunjung berhenti (formulir, checkout).
- Apakah ada error yang dilaporkan pengguna.

Perbaiki cepat, dan situs Anda akan makin tajam seiring waktu.

## Penutup

Checklist ini bukan untuk membuat Anda ragu, tetapi untuk memastikan **tidak ada yang terlewat**. Website yang matang di hari pertama menghemat banyak perbaikan darurat di kemudian hari.

---

Mau website bisnis Anda diluncurkan dengan standar profesional — cepat, aman, ramah SEO? **Diskusikan dengan tim LKTech** — kami bantu dari perencanaan sampai rilis.`,
    category: "Panduan",
    tags: ["Checklist", "Website Bisnis", "Peluncuran", "SEO", "Panduan"],
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-05-15T08:00:00.000Z",
  },
];

/* ------------------------------------------------------------------ */
/* 3. Tulis ke Firestore                                               */
/* ------------------------------------------------------------------ */
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

async function main() {
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const article of ARTICLES) {
    const ref = db.collection("articles").doc(article.slug);
    const existed = (await ref.get()).exists;

    const payload = {
      ...stripUndefined(article),
      // coverImage dibiarkan kosong → diatur manual via /admin/blog.
      updatedAtISO: now,
      updatedBy: "seed-script",
    };

    await ref.set(payload, { merge: true });
    if (existed) updated += 1;
    else created += 1;
    console.log(
      `✓ Artikel "${article.title}" ${existed ? "DIPERBARUI" : "DIBUAT"}.`,
    );
  }

  console.log("");
  console.log(`Selesai: ${created} dibuat, ${updated} diperbarui.`);
  console.log("");
  console.log("Verifikasi:");
  console.log("  1. Buka /blog → 9 artikel tampil.");
  console.log("  2. Buka /blog/kategori/panduan → artikel kategori Panduan.");
  console.log("  3. Buka /blog/kategori/bisnis-digital → artikel kategori Bisnis Digital.");
  console.log("  4. Buka /blog/tag/ai → artikel bertag AI.");
  console.log("  5. Buka /blog/rss.xml → feed berisi artikel.");
  console.log("  6. Atur gambar sampul tiap artikel via /admin/blog (tab Sampul).");
}

main().catch((err) => {
  console.error("✗ Gagal seed artikel:", err);
  process.exit(1);
});
