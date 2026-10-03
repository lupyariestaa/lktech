/**
 * Seed artikel blog LKTech.
 *
 * Cara pakai (jalankan di root project):
 *   node scripts/seed-articles.mjs
 *
 * Membaca kredensial Firebase Admin dari `.env.local`.
 * Sifat: IDEMPOTEN — menjalankan ulang MENIMPA dokumen artikel yang sama
 * (articles/<slug>). Aman diulang.
 *
 * Menulis 3 artikel:
 *   1. "Gemini AI & Bisnis: Cara Cerdas Memanfaatkan Kecerdasan Buatan"
 *   2. "AI untuk UMKM: 10 Pekerjaan yang Bisa Diotomatiskan Hari Ini"
 *   3. "Masa Depan Web: Kenapa Bisnis Anda Perlu Bersiap Sejak Sekarang"
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
  console.log("  1. Buka /blog → 3 artikel tampil.");
  console.log("  2. Buka /blog/tag/ai → artikel bertag AI.");
  console.log("  3. Buka /blog/kategori/teknologi → artikel kategori Teknologi.");
  console.log("  4. Buka /blog/rss.xml → feed berisi artikel.");
  console.log("  5. Atur gambar sampul tiap artikel via /admin/blog (tab Sampul).");
}

main().catch((err) => {
  console.error("✗ Gagal seed artikel:", err);
  process.exit(1);
});
