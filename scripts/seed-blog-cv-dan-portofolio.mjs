/**
 * Seed artikel SEO LKTech tentang CV dan portofolio kerja.
 * Jalankan dari root project: node scripts/seed-blog-cv-dan-portofolio.mjs
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
  slug: "lamaran-kerja-cv-dan-portofolio-online",
  title: "Melamar Kerja Tak Cukup Hanya dengan CV: Mengapa Portofolio Kini Penting?",
  excerpt:
    "CV merangkum pengalaman, tetapi portofolio menunjukkan bukti karya. Pelajari cara menyiapkan portofolio kerja yang relevan, meyakinkan, dan mudah diakses perekrut.",
  body: `Saat membuka lowongan kerja, banyak pelamar memulai dengan memperbarui CV: merapikan pengalaman, menambahkan keterampilan, lalu mengirim dokumen ke perusahaan yang dituju. Namun, untuk banyak posisi—terutama bidang kreatif, teknologi, pemasaran, dan pekerjaan berbasis proyek—perekrut juga ingin melihat contoh hasil kerja. Di sinilah portofolio dapat melengkapi cerita yang disampaikan CV.

CV dan portofolio memiliki fungsi yang berbeda. CV merangkum siapa Anda, apa pengalaman Anda, dan keterampilan apa yang dimiliki. Portofolio memperlihatkan bagaimana keterampilan tersebut digunakan untuk menyelesaikan pekerjaan nyata. Keduanya bukan pilihan yang saling menggantikan: CV membantu perekrut memahami perjalanan karier, sedangkan portofolio memberi bukti yang lebih konkret.

## Mengapa perekrut ingin melihat portofolio?

CV biasanya menjelaskan tanggung jawab dan pencapaian dalam bentuk ringkas. Pernyataan seperti “mengelola media sosial”, “membuat desain”, atau “mengembangkan aplikasi” memberi gambaran awal, tetapi belum tentu menunjukkan pendekatan dan kualitas hasilnya.

Melalui contoh karya, perekrut dapat melihat konteks, proses, dan kontribusi pelamar. Seorang desainer dapat menunjukkan sistem visual yang dibuat. Penulis dapat membagikan artikel atau contoh kampanye. Pengembang dapat menjelaskan fitur yang dibangun dan keputusan teknis di baliknya. Kandidat pemasaran dapat menampilkan strategi, materi kampanye, dan hasil yang boleh dipublikasikan.

Portofolio juga membantu percakapan saat wawancara. Alih-alih hanya menyebutkan pengalaman, pelamar dapat menjelaskan tantangan, pilihan yang diambil, dan pelajaran dari proyek tersebut. Hal ini memberi gambaran yang lebih kaya tentang cara seseorang bekerja.

## Tidak semua pekerjaan meminta portofolio—tetapi bukti kerja tetap berguna

Kebutuhan portofolio bergantung pada posisi, industri, dan proses rekrutmen. Beberapa perusahaan secara jelas meminta tautan portofolio, sementara yang lain cukup meminta CV dan wawancara. Untuk pekerjaan yang hasilnya dapat ditunjukkan, menyiapkan contoh karya dapat menjadi nilai tambah meskipun tidak tercantum sebagai syarat.

Untuk bidang yang tidak menghasilkan karya visual, portofolio tetap bisa berbentuk studi kasus, laporan yang sudah dianonimkan, presentasi, dokumentasi proses, atau contoh pemecahan masalah. Kandidat administrasi, analis, pendidik, peneliti, dan profesional operasional juga dapat menunjukkan hasil kerja dengan cara yang sesuai, selama tidak membocorkan informasi rahasia.

Jika lowongan tidak meminta portofolio, jangan mengirim lampiran berlebihan. Tautan ringkas yang relevan dapat disertakan pada CV atau surat pengantar bila memang membantu menjelaskan kecocokan Anda dengan posisi tersebut.

## Apa saja yang sebaiknya dimasukkan?

Portofolio kerja yang efektif bukan sekadar kumpulan gambar atau tautan. Pilih beberapa contoh yang paling relevan dengan pekerjaan yang dituju. Untuk setiap proyek, jelaskan:

1. **Konteks:** siapa pengguna atau kliennya, dan masalah apa yang ingin diselesaikan?
2. **Peran Anda:** apa tanggung jawab dan kontribusi pribadi Anda?
3. **Proses:** bagaimana Anda memahami masalah dan menentukan pendekatan?
4. **Hasil:** apa yang dibuat atau berubah setelah pekerjaan selesai?
5. **Pembelajaran:** apa yang akan Anda pertahankan atau tingkatkan pada proyek berikutnya?

Jika memungkinkan, sertakan hasil yang dapat diverifikasi, seperti peningkatan waktu proses, pertumbuhan keterlibatan, jumlah pengguna, atau penyelesaian proyek. Gunakan angka hanya jika benar dan Anda memiliki izin untuk membagikannya. Bila data bersifat rahasia, jelaskan hasil secara umum atau samarkan identitas pihak terkait.

## Belum punya pengalaman kerja profesional?

Portofolio tidak harus berisi proyek dari perusahaan besar. Proyek pribadi, tugas kuliah, kontribusi komunitas, pekerjaan sukarela, latihan mandiri, atau proyek simulasi dapat menunjukkan cara Anda berpikir dan kemampuan yang sedang dikembangkan.

Yang penting, jelaskan dengan jujur bahwa proyek tersebut merupakan proyek pribadi atau simulasi. Jangan menyajikannya seolah-olah berasal dari klien sungguhan. Perekrut dapat menghargai inisiatif, tetapi kejujuran tentang konteks karya juga membangun kepercayaan.

Untuk memulai, pilih satu masalah yang ingin Anda pecahkan. Buat contoh hasil yang realistis, dokumentasikan langkah-langkahnya, lalu tulis ringkasan tentang tujuan, keputusan, dan hasil. Beberapa proyek yang dijelaskan dengan baik biasanya lebih meyakinkan daripada banyak karya tanpa konteks.

## Website portofolio atau platform pihak ketiga?

Portofolio dapat dibagikan melalui platform khusus, repositori kode, dokumen presentasi, atau website portofolio pribadi. Pilih wadah yang paling sesuai dengan jenis pekerjaan dan kebiasaan perekrut di bidang Anda.

Platform pihak ketiga sering membantu memulai dengan cepat dan dapat memiliki komunitas pengguna. Namun, tata letak serta pengalaman pengunjung mengikuti batasan platform tersebut. Website portofolio pribadi memberi keleluasaan lebih besar untuk mengatur struktur, identitas profesional, dan cara setiap proyek diceritakan.

Website portofolio juga menyediakan satu tautan yang mudah dicantumkan pada CV, profil profesional, dan surat lamaran. Pelamar dapat mengatur halaman seperti “Tentang Saya”, “Proyek”, “Keahlian”, dan “Kontak” agar informasi mudah ditemukan. Namun, website sendiri bukan jaminan langsung mendapat pekerjaan; kualitas karya, relevansi, komunikasi, dan kecocokan dengan posisi tetap menjadi faktor penting.

## Cara membuat website portofolio yang profesional

### Buat halaman utama yang langsung menjelaskan fokus Anda

Dalam beberapa detik, pengunjung sebaiknya memahami bidang yang Anda tekuni dan jenis masalah yang dapat Anda bantu selesaikan. Gunakan deskripsi singkat dan spesifik, bukan klaim umum seperti “profesional terbaik” tanpa bukti.

### Pilih proyek dengan cermat

Mulailah dengan tiga hingga enam proyek yang menunjukkan kemampuan dan jenis pekerjaan yang ingin Anda dapatkan. Urutkan berdasarkan relevansi, bukan semata-mata tanggal. Jika Anda melamar posisi tertentu, sesuaikan pilihan karya agar perekrut tidak perlu mencari-cari contoh yang sesuai.

### Ceritakan proses, bukan hanya hasil akhir

Gambar akhir memang menarik perhatian, tetapi konteks menunjukkan cara Anda berpikir. Jelaskan tantangan, batasan, peran Anda, dan keputusan penting. Jika proyek dikerjakan bersama tim, sebutkan bagian yang benar-benar Anda kerjakan.

### Pastikan mudah dibuka di ponsel

Perekrut bisa saja membuka tautan dari ponsel. Gunakan teks yang mudah dibaca, gambar yang tidak terlalu berat, navigasi sederhana, dan tautan yang berfungsi. Jangan meminta pengunjung membuat akun hanya untuk melihat karya publik.

### Sertakan informasi kontak yang jelas

Cantumkan alamat email profesional atau jalur kontak yang memang Anda pantau. Periksa kembali ejaan, tautan profil profesional, dan izin akses berkas. Hindari menampilkan nomor pribadi atau informasi sensitif yang tidak diperlukan.

## Perhatikan hak cipta dan kerahasiaan

Jangan mempublikasikan dokumen internal, data pelanggan, kode perusahaan, atau karya klien tanpa izin. Jika suatu proyek terikat perjanjian kerahasiaan, Anda dapat menjelaskan keterampilan dan proses secara umum tanpa mengungkapkan detail yang dilindungi.

Untuk karya kolaboratif, berikan kredit kepada anggota tim dan jelaskan kontribusi masing-masing. Untuk proyek latihan yang menggunakan aset milik orang lain, pastikan penggunaan aset tersebut diizinkan dan sumbernya dicantumkan bila diperlukan.

## Optimalkan portofolio untuk proses lamaran

Perbarui CV agar tautan portofolio mudah ditemukan, misalnya di bagian kontak atau informasi profil. Pastikan tautan mengarah langsung ke halaman yang relevan, bukan ke folder yang meminta izin akses. Uji tautan menggunakan jendela privat atau perangkat lain sebelum mengirim lamaran.

Jangan mengirim portofolio generik ke semua posisi tanpa penyesuaian. Pilih karya yang menjawab kebutuhan lowongan dan gunakan deskripsi yang jelas. Jika mengirim melalui email, beri nama berkas secara profesional dan tulis pesan singkat yang menerangkan mengapa contoh karya tersebut relevan.

## CV dan portofolio bekerja lebih baik bersama

Bayangkan CV sebagai peta ringkas perjalanan profesional, sementara portofolio adalah kesempatan untuk melihat beberapa bagian perjalanan itu secara lebih dekat. CV membantu perekrut menyaring pengalaman dan kualifikasi. Portofolio membantu menunjukkan penerapan kemampuan dalam konteks yang nyata.

Tidak semua pekerjaan mengharuskan portofolio, dan satu website yang menarik tidak dapat menggantikan kompetensi. Namun, bagi pelamar yang dapat menunjukkan hasil kerja, portofolio yang terkurasi dengan baik bisa membantu membuat pengalaman lebih mudah dipahami dan dibahas.

Mulailah dari karya yang sudah dimiliki, jelaskan kontribusi dengan jujur, dan susun agar mudah diakses. Portofolio terbaik bukan yang paling ramai, melainkan yang paling jelas menunjukkan kemampuan yang dibutuhkan untuk pekerjaan berikutnya.`,
  category: "Karier dan Teknologi",
  tags: ["Portofolio Kerja", "CV", "Lamaran Kerja", "Website Portofolio", "Karier Digital", "SEO"],
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
