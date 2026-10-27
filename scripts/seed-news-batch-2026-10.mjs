/**
 * Seed lima artikel berita LKTech.
 * Jalankan dari root project: node scripts/seed-news-batch-2026-10.mjs
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

const ARTICLES = [
  {
    slug: "ai-generatif-di-sekolah-peluang-dan-tantangan",
    title: "AI Generatif Masuk Ruang Kelas: Membuka Peluang Belajar, Menuntut Literasi Baru",
    excerpt:
      "AI generatif dapat membantu siswa belajar dan guru menyiapkan materi, tetapi manfaatnya bergantung pada cara teknologi ini digunakan, diperiksa, dan diajarkan secara bertanggung jawab.",
    body: `Kecerdasan buatan generatif kini mudah dijangkau melalui ponsel dan komputer. Siswa dapat meminta penjelasan konsep, membuat rangkuman, atau berlatih bahasa; guru dapat menggunakannya untuk menyusun variasi soal dan mencari pendekatan penyampaian materi. Perubahan ini membawa peluang nyata, sekaligus pertanyaan penting tentang apa arti belajar ketika sebuah alat dapat menghasilkan jawaban dalam hitungan detik.

## Asisten belajar yang selalu tersedia

Salah satu manfaat AI adalah kemampuannya menyajikan penjelasan dengan cara berbeda. Jika penjelasan pertama belum dipahami, siswa dapat meminta contoh lain, analogi yang lebih sederhana, atau langkah penyelesaian yang lebih terperinci. Ini dapat membantu proses belajar mandiri, terutama ketika siswa membutuhkan pengulangan di luar jam kelas.

Guru juga dapat memakai AI untuk mempercepat pekerjaan persiapan. Draf kuis, ide diskusi, atau variasi latihan dapat dibuat sebagai titik awal, lalu disesuaikan dengan kurikulum dan kondisi kelas. Dengan begitu, waktu yang biasanya habis untuk tugas berulang berpotensi dialihkan untuk memberi umpan balik dan mendampingi siswa.

## Jawaban cepat bukan berarti jawaban benar

AI dapat menyampaikan informasi keliru dengan bahasa yang terdengar meyakinkan. Ia juga bisa mengabaikan konteks lokal, tingkat kemampuan siswa, atau sumber rujukan yang diperlukan. Karena itu, hasil AI sebaiknya diperlakukan sebagai draf yang perlu diperiksa, bukan sebagai sumber kebenaran otomatis.

Di kelas, kegiatan memeriksa jawaban dapat menjadi bagian dari pembelajaran itu sendiri. Siswa bisa diminta membandingkan jawaban AI dengan buku, sumber tepercaya, dan penalaran mereka sendiri. Pertanyaan seperti “bukti apa yang mendukung jawaban ini?” membantu membangun kebiasaan berpikir kritis, bukan sekadar menerima keluaran mesin.

## Menjaga proses berpikir siswa

Risiko lain muncul ketika AI digunakan untuk mengerjakan tugas tanpa pemahaman. Jika hasil akhirnya saja yang dinilai, siswa mungkin terdorong untuk menyalin jawaban. Guru dapat merespons dengan meminta siswa menjelaskan proses, menunjukkan draf, mempresentasikan hasil, atau menghubungkan tugas dengan pengalaman dan diskusi di kelas.

Aturan penggunaan yang jelas juga penting. Sekolah dapat menentukan kapan AI boleh digunakan, bagaimana bantuan tersebut dicantumkan, dan informasi apa yang tidak boleh dimasukkan ke layanan publik. Data pribadi siswa, dokumen internal, dan informasi sensitif sebaiknya tidak diunggah sembarangan.

## Pendamping, bukan pengganti hubungan manusia

Teknologi tidak menggantikan peran guru dalam memahami kebutuhan siswa, membangun rasa percaya, dan menciptakan lingkungan belajar yang aman. AI dapat membantu menyediakan bahan atau memberi latihan, tetapi keputusan tentang tujuan pembelajaran dan dukungan yang dibutuhkan tetap memerlukan pertimbangan manusia.

Pada akhirnya, pertanyaan terpenting bukan hanya alat AI apa yang digunakan, melainkan kemampuan apa yang ingin dibangun. Jika siswa belajar memeriksa fakta, menjaga privasi, mengakui bantuan teknologi, dan tetap menyusun pemikiran sendiri, AI dapat menjadi sarana belajar yang bermanfaat. Literasi AI dengan demikian menjadi bagian dari literasi digital yang perlu dibangun bersama oleh sekolah, keluarga, dan pengembang teknologi.`,
    category: "Teknologi",
    tags: ["AI", "Pendidikan", "Literasi Digital", "Kecerdasan Buatan"],
  },
  {
    slug: "penipuan-phishing-ai-suara-dan-pesan-palsu",
    title: "Phishing Makin Meyakinkan: Suara Tiruan dan Pesan Personal Jadi Tantangan Keamanan Baru",
    excerpt:
      "Pesan penipuan dapat dibuat lebih personal dan suara dapat ditiru dengan teknologi AI. Verifikasi lewat kanal kedua menjadi kebiasaan penting sebelum mengirim uang atau data.",
    body: `Penipuan digital terus memanfaatkan kebiasaan manusia: rasa panik, kepercayaan kepada orang terdekat, dan keinginan menyelesaikan masalah dengan cepat. Perkembangan AI membuat sebagian pesan palsu lebih mudah disesuaikan dengan korban, sementara teknologi sintesis suara dapat meniru karakteristik suara. Namun, prinsip dasar phishing tetap sama: pelaku berusaha membuat korban bertindak sebelum sempat memeriksa.

## Pesan yang terasa sangat pribadi

Pesan phishing biasanya meminta penerima mengeklik tautan, membuka lampiran, membagikan kode verifikasi, atau melakukan transfer. Pelaku dapat menyamar sebagai bank, kurir, layanan digital, atasan, bahkan anggota keluarga. Informasi yang tersedia di media sosial atau kebocoran data dapat membuat pesan terasa akrab dan meyakinkan.

Teknologi generatif dapat membantu penipu menyusun pesan dengan tata bahasa yang lebih rapi atau membuat variasi pesan untuk banyak sasaran. Karena itu, kesalahan ejaan yang mencolok bukan lagi satu-satunya petunjuk. Pengguna perlu memperhatikan isi permintaan, alamat pengirim, alamat situs, dan tekanan agar bertindak segera.

## Jika suara orang terdekat meminta uang

Permintaan darurat melalui telepon atau pesan suara perlu diverifikasi, terutama bila disertai permintaan uang, kata sandi, atau kode OTP. Tutup panggilan dan hubungi orang tersebut kembali melalui nomor yang sudah tersimpan, atau tanyakan hal yang hanya diketahui oleh pihak yang bersangkutan. Untuk transaksi penting, gunakan jalur konfirmasi kedua yang telah disepakati sebelumnya.

Jangan mengandalkan suara sebagai satu-satunya bukti identitas. Bahkan jika suara terdengar mirip, permintaan yang mendesak tetap patut diperiksa. Kebiasaan menunda beberapa menit untuk memverifikasi dapat mencegah kerugian besar.

## Langkah perlindungan yang bisa dilakukan

Pertama, jangan membuka tautan dari pesan yang tidak diminta. Buka aplikasi resmi secara langsung atau ketik alamat situs sendiri. Kedua, jangan membagikan OTP, PIN, kata sandi, maupun kode pemulihan kepada siapa pun. Ketiga, aktifkan autentikasi multifaktor dan gunakan kata sandi unik untuk setiap layanan penting.

Perbarui perangkat dan aplikasi secara berkala, serta gunakan kunci layar. Untuk akun bisnis, batasi siapa yang dapat menyetujui pembayaran dan gunakan proses persetujuan lebih dari satu orang untuk transaksi bernilai besar. Tim juga perlu memiliki prosedur untuk memverifikasi instruksi keuangan yang datang lewat pesan.

## Jika telanjur memberikan informasi

Segera ubah kata sandi melalui situs atau aplikasi resmi, cabut sesi perangkat yang tidak dikenal, dan hubungi penyedia layanan melalui kanal resmi. Jika informasi pembayaran telah diberikan atau transfer terlanjur dilakukan, hubungi bank atau penyedia pembayaran secepat mungkin dan simpan bukti komunikasi. Beri tahu kontak yang mungkin menerima pesan serupa dari akun Anda.

Tidak ada satu teknologi yang dapat menghapus seluruh risiko penipuan. Pertahanan paling kuat adalah perpaduan perangkat yang diperbarui, kebiasaan menjaga informasi rahasia, dan proses verifikasi yang tidak bergantung pada satu pesan atau satu suara. Dalam situasi mendesak, jeda untuk memeriksa bukan sikap berlebihan—itu bagian dari keamanan digital.`,
    category: "Keamanan Siber",
    tags: ["Phishing", "Keamanan Siber", "AI", "Privasi", "Penipuan Digital"],
  },
  {
    slug: "daur-ulang-baterai-kendaraan-listrik-ekosistem",
    title: "Setelah Kendaraan Listrik, Apa yang Terjadi pada Baterainya?",
    excerpt:
      "Umur baterai kendaraan listrik tidak berakhir saat performanya menurun. Penggunaan ulang dan daur ulang membutuhkan ekosistem pengumpulan, pengujian, dan keselamatan yang matang.",
    body: `Perbincangan tentang kendaraan listrik biasanya berfokus pada jarak tempuh, harga, dan ketersediaan pengisian daya. Ada satu bagian lain yang sama pentingnya bagi keberlanjutan: apa yang dilakukan terhadap baterai ketika kapasitasnya tidak lagi sesuai untuk kebutuhan kendaraan.

Menurunnya kapasitas tidak otomatis membuat baterai langsung menjadi limbah. Baterai yang sudah kurang ideal untuk kendaraan masih mungkin memiliki kapasitas tersisa untuk penggunaan lain, bergantung pada kondisi sel, desain, riwayat pemakaian, dan hasil pemeriksaan keselamatan.

## Penggunaan ulang perlu pengujian

Salah satu kemungkinan adalah menggunakan baterai untuk penyimpanan energi stasioner. Sistem semacam ini dapat menyimpan listrik untuk digunakan kemudian, misalnya pada fasilitas yang membutuhkan pengelolaan energi lebih fleksibel. Akan tetapi, tidak semua baterai cocok untuk penggunaan kedua.

Setiap unit perlu diperiksa untuk mengetahui kesehatan, kestabilan, dan kesesuaiannya dengan sistem baru. Proses pengujian, pemantauan, serta perlindungan dari panas berlebih harus dirancang dengan cermat. Tanpa standar dan pencatatan yang baik, pemanfaatan kembali justru dapat menambah risiko keselamatan.

## Daur ulang dan pemulihan material

Ketika baterai tidak lagi layak digunakan, proses daur ulang dapat membantu mengambil kembali material tertentu untuk digunakan dalam rantai pasok. Tingkat pemulihan dan dampak lingkungan bergantung pada teknologi pengolahan, jenis baterai, desain produk, serta kualitas fasilitas yang menangani.

Pengumpulan menjadi bagian yang tidak kalah penting. Baterai tidak seharusnya dibongkar atau dibuang bersama sampah rumah tangga. Sistem yang jelas diperlukan agar baterai sampai ke fasilitas yang memiliki kemampuan dan prosedur khusus untuk menanganinya.

## Desain produk memengaruhi masa depan baterai

Baterai yang dirancang agar mudah diperiksa, dilepas, dan dipisahkan komponennya dapat membantu proses perbaikan maupun pengolahan di akhir masa pakai. Produsen, pemerintah, penyedia layanan, dan pengguna memiliki peran berbeda dalam membangun siklus tersebut.

Informasi mengenai komposisi, riwayat penggunaan, dan kondisi baterai juga mendukung keputusan apakah unit sebaiknya digunakan kembali atau didaur ulang. Transparansi rantai pasok membantu memastikan proses berlangsung lebih bertanggung jawab.

## Keberlanjutan tidak cukup diukur dari knalpot

Kendaraan listrik dapat mengurangi emisi di titik penggunaan, tetapi penilaian dampak secara menyeluruh juga perlu memperhatikan sumber listrik, bahan baku, proses produksi, dan pengelolaan baterai. Ini bukan alasan untuk menolak teknologi, melainkan pengingat bahwa transisi energi memerlukan perencanaan dari hulu sampai hilir.

Ekosistem baterai yang matang akan membutuhkan investasi, regulasi yang jelas, fasilitas pengujian dan pengolahan, serta edukasi publik. Semakin awal tanggung jawab akhir masa pakai dirancang, semakin besar peluang baterai memberi manfaat lebih lama dan materialnya dimanfaatkan dengan lebih baik.`,
    category: "Energi dan Lingkungan",
    tags: ["Kendaraan Listrik", "Baterai", "Daur Ulang", "Energi", "Lingkungan"],
  },
  {
    slug: "pusat-data-ai-efisiensi-energi-dan-air",
    title: "Pertumbuhan AI Membuat Pusat Data Disorot: Efisiensi Energi dan Air Jadi Fokus",
    excerpt:
      "Layanan cloud dan AI bergantung pada pusat data yang bekerja sepanjang waktu. Pengelolaan energi, pendinginan, dan keterbukaan dampak menjadi bagian dari tantangan infrastruktur digital.",
    body: `Setiap permintaan untuk menyimpan berkas, menonton video, atau menggunakan layanan AI diproses oleh infrastruktur komputasi yang tersebar di berbagai lokasi. Pusat data membuat layanan digital dapat tersedia sepanjang waktu, tetapi operasinya membutuhkan listrik, sistem pendingin, jaringan, dan perencanaan kapasitas yang cermat.

Permintaan komputasi yang meningkat menjadikan efisiensi pusat data perhatian penting bagi industri dan masyarakat. Dampak sebuah fasilitas tidak hanya ditentukan oleh jumlah server, tetapi juga lokasi, sumber energi, desain bangunan, cara pendinginan, dan bagaimana kapasitasnya digunakan.

## Energi untuk menghitung dan mendinginkan

Server menghasilkan panas saat memproses data. Sistem pendingin menjaga perangkat bekerja dalam rentang yang aman, sehingga desain pendinginan dapat memengaruhi penggunaan energi secara keseluruhan. Operator dapat mengoptimalkan tata letak, aliran udara, pemantauan suhu, dan pengaturan beban untuk menghindari konsumsi yang tidak perlu.

Perangkat yang lebih efisien dan pengelolaan komputasi yang baik juga dapat membantu. Namun, efisiensi per unit kerja tidak otomatis berarti konsumsi total turun apabila jumlah layanan dan komputasi tumbuh lebih cepat. Karena itu, pengukuran konsumsi secara berkala tetap diperlukan.

## Air dan kondisi lingkungan setempat

Sebagian sistem pendinginan menggunakan air, sementara sistem lain mengandalkan pendekatan berbeda sesuai iklim dan desain fasilitas. Kebutuhan air perlu dilihat bersama kondisi daerah setempat: sumber air apa yang digunakan, bagaimana ketersediaannya, dan apakah pemakaian fasilitas bersaing dengan kebutuhan warga atau sektor lain.

Keputusan lokasi sebaiknya mempertimbangkan kapasitas jaringan listrik, sumber energi, iklim, ketersediaan air, dan dampak kepada komunitas sekitar. Transparansi membantu masyarakat memahami dampak serta manfaat fasilitas yang beroperasi di wilayah mereka.

## Efisiensi dan energi rendah emisi

Penggunaan energi yang lebih bersih dapat mengurangi dampak emisi operasional, tetapi penerapannya memerlukan kecocokan antara kebutuhan pusat data dan pasokan energi yang tersedia. Perencanaan jangka panjang dapat mencakup kontrak energi, fleksibilitas waktu komputasi bila memungkinkan, dan kerja sama dengan penyedia jaringan.

Perusahaan pengguna layanan cloud juga dapat berperan dengan memilih ukuran komputasi yang sesuai, menghapus data dan proses yang tidak diperlukan, serta mengevaluasi apakah beban kerja dijalankan secara efisien. Mengurangi komputasi yang tidak memberi nilai merupakan langkah praktis di sisi pengguna.

## Infrastruktur digital yang bertanggung jawab

Pusat data bukan sekadar bangunan teknologi yang terpisah dari lingkungan. Ia adalah bagian dari sistem energi, ekonomi, dan komunitas. Keandalan layanan digital tetap penting, tetapi pertumbuhan infrastruktur perlu dibarengi pelaporan yang mudah dipahami, penggunaan sumber daya yang bijak, dan dialog dengan masyarakat.

Ketika AI dan layanan digital terus berkembang, pertanyaan yang perlu diajukan bukan hanya berapa kapasitas komputasi yang dapat dibangun. Pertanyaan tentang energi, air, efisiensi, serta manfaat bagi pengguna juga perlu menjadi bagian dari keputusan. Infrastruktur digital yang kuat adalah infrastruktur yang dapat tumbuh tanpa mengabaikan batas sumber daya.`,
    category: "Teknologi dan Lingkungan",
    tags: ["Pusat Data", "AI", "Energi", "Cloud Computing", "Lingkungan"],
  },
  {
    slug: "dompet-digital-keamanan-transaksi-dan-privasi",
    title: "Dompet Digital Makin Praktis, Keamanan Transaksi Tetap Dimulai dari Pengguna",
    excerpt:
      "Pembayaran melalui ponsel mengurangi langkah transaksi, tetapi PIN, perangkat, dan kode verifikasi tetap harus dijaga. Kenali kebiasaan aman sebelum membayar.",
    body: `Pembayaran digital telah menjadi bagian dari banyak aktivitas sehari-hari: membeli makanan, membayar transportasi, hingga berbelanja daring. Dompet digital menawarkan proses yang cepat, riwayat transaksi yang mudah diperiksa, dan beragam cara pembayaran. Kemudahan tersebut membuat perlindungan akun menjadi semakin penting.

Risiko tidak selalu berasal dari sistem pembayaran itu sendiri. Perangkat yang dipinjamkan tanpa pengawasan, kata sandi yang digunakan berulang, tautan palsu, dan permintaan kode OTP dapat membuka jalan bagi pengambilalihan akun. Kebiasaan pengguna dan kualitas keamanan perangkat sama-sama berpengaruh.

## Lindungi akun dan perangkat

Gunakan PIN yang tidak mudah ditebak dan jangan menggunakan kombinasi yang sama dengan tanggal lahir atau nomor yang mudah diketahui orang lain. Aktifkan penguncian layar, biometrik bila tersedia, dan autentikasi tambahan yang disediakan layanan. Jangan menyimpan PIN dalam catatan tanpa perlindungan di ponsel.

Pastikan aplikasi diunduh melalui toko aplikasi resmi dan periksa nama pengembangnya. Pembaruan aplikasi dan sistem operasi dapat memperbaiki celah keamanan. Hindari memasang aplikasi dari tautan pesan yang tidak jelas, terutama jika aplikasi tersebut meminta akses yang tidak relevan.

## Jangan pernah membagikan kode rahasia

Kode OTP, PIN, kata sandi, dan kode pemulihan berfungsi melindungi akses akun. Pihak lain tidak membutuhkannya untuk membantu menyelesaikan masalah. Jika seseorang meminta kode tersebut melalui telepon, pesan, atau media sosial, hentikan komunikasi dan hubungi layanan pelanggan melalui kanal resmi.

Waspadai juga pesan yang menyatakan hadiah, pengembalian dana, atau akun akan diblokir jika tidak segera mengeklik tautan. Buka aplikasi secara langsung untuk memeriksa notifikasi. Alamat situs yang mirip dengan nama layanan resmi tetap dapat menjadi halaman tiruan.

## Periksa sebelum mengonfirmasi pembayaran

Sebelum memasukkan PIN atau menekan tombol bayar, periksa nama penerima, jumlah, dan detail transaksi. Untuk pembayaran menggunakan kode QR, pastikan kode berasal dari merchant yang benar dan nominal yang muncul sesuai. Jangan merasa harus melanjutkan hanya karena antrean atau karena seseorang mendesak.

Tinjau riwayat transaksi secara berkala dan aktifkan notifikasi transaksi bila tersedia. Pemberitahuan dapat membantu mendeteksi aktivitas yang tidak dikenali lebih cepat. Jika ponsel hilang, gunakan mekanisme resmi untuk mengunci perangkat, keluar dari akun, dan menghubungi penyedia pembayaran.

## Praktis, dengan kebiasaan yang tepat

Dompet digital dapat membantu mengelola pembayaran, tetapi tidak menggantikan kewaspadaan. Pengguna tetap perlu menjaga perangkat, membatasi informasi yang dibagikan, dan memahami cara melaporkan masalah. Penyedia layanan pun perlu menyediakan informasi keamanan dan saluran dukungan yang jelas.

Teknologi pembayaran yang baik bukan hanya cepat, tetapi juga membuat pengguna memahami apa yang sedang mereka setujui. Dengan memeriksa detail, menolak permintaan kode rahasia, dan memakai kanal resmi, transaksi digital dapat dilakukan dengan lebih aman dan percaya diri.`,
    category: "Teknologi Finansial",
    tags: ["Dompet Digital", "Fintech", "Keamanan", "Pembayaran Digital", "Privasi"],
  },
];

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

async function main() {
  const publishedAt = "2026-10-26T08:00:00.000Z";
  let created = 0;
  let updated = 0;
  for (const article of ARTICLES) {
    const ref = db.collection("articles").doc(article.slug);
    const existed = (await ref.get()).exists;
    await ref.set(
      {
        ...article,
        cover: "default",
        author: "LKTech",
        status: "published",
        publishedAt,
        updatedAtISO: new Date().toISOString(),
        updatedBy: "seed-script",
      },
      { merge: true },
    );
    if (existed) updated += 1;
    else created += 1;
    console.log(`✓ ${existed ? "Diperbarui" : "Dibuat"}: ${article.title}`);
  }
  console.log(`Selesai: ${created} dibuat, ${updated} diperbarui.`);
}

main().catch((error) => {
  console.error("✗ Gagal seed artikel:", error);
  process.exit(1);
});
