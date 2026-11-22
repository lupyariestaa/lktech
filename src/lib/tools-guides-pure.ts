/**
 * KONTEN PANDUAN PUBLIK per tool (`/tools/panduan/[slug]`).
 *
 * Modul murni tanpa impor runtime agar dapat diuji Node. Konten sengaja unik per
 * tool (bukan template kosong) supaya halaman panduan punya nilai SEO nyata dan
 * tidak menyaingi workspace yang tetap login-gated.
 *
 * Aturan: jangan menulis klaim yang tidak bisa diverifikasi ("100% aman"),
 * angka pengguna fiktif, atau batas yang berbeda dari body tool.
 */

export type ToolGuideFaq = {
  question: string;
  answer: string;
};

export type ToolGuide = {
  slug: string;
  /** Judul H1 panduan (boleh berbeda dari nama tool di registry). */
  title: string;
  intro: string;
  steps: readonly string[];
  useCases: readonly string[];
  faq: readonly ToolGuideFaq[];
};

/** Tanggal editorial konten panduan (dipakai metadata & sitemap). */
export const TOOL_GUIDES_UPDATED = "2026-11-22";

export const TOOL_GUIDES: readonly ToolGuide[] = [
  {
    slug: "color-picker",
    title: "Color Studio: Ambil Warna Gambar, Palet, HEX, RGB, dan HSL",
    intro:
      "Color Studio LKTech membantu Anda memilih warna dari kontrol visual atau gambar lokal, mengekstrak palet representatif, memeriksa kontras teks, membuat gradient, dan menyalin nilai yang siap dipakai di desain maupun kode. Semua perhitungan berjalan di browser Anda.",
    steps: [
      "Buka Color Studio dari ruang tools LKTech.",
      "Pilih warna lewat kontrol visual, preset, atau tempel kode HEX; atur alfa bila diperlukan.",
      "Untuk mengambil warna dari referensi, buka menu Dari gambar, pilih gambar lokal, lalu klik titik warna pada preview; pengguna keyboard dapat memakai panah dan Enter/Spasi.",
      "Gunakan palet, pemeriksa kontras, atau pembuat gradient sesuai kebutuhan, lalu salin HEX, RGB, HSL, CSS, atau CSS variables palet.",
    ],
    useCases: [
      "Menyamakan warna komponen dengan warna brand.",
      "Mengambil kode warna dan palet dari referensi visual atau screenshot lokal.",
      "Membuat varian warna dengan tingkat transparansi berbeda.",
      "Menyalin deklarasi CSS untuk langsung ditempel di stylesheet.",
      "Memeriksa apakah kombinasi teks dan latar memenuhi ambang kontras WCAG.",
    ],
    faq: [
      {
        question: "Format warna apa yang bisa dihasilkan Color Studio?",
        answer:
          "Color Studio menampilkan HEX, RGB, HSL, deklarasi CSS background, CSS gradient, serta CSS variables dari palet. Nilai dapat disalin dari workspace.",
      },
      {
        question: "Apakah saya perlu akun untuk memakai Color Studio?",
        answer:
          "Demo warna di halaman /tools bisa dicoba tanpa akun. Untuk workspace penuh, pengambilan warna gambar, dan fitur salin nilai, masuk dengan akun LKTech.",
      },
      {
        question: "Apakah gambar atau warna saya dikirim ke server?",
        answer:
          "Tidak. Nilai warna dan gambar lokal diproses di browser Anda dan tidak dikirim maupun disimpan di server.",
      },
      {
        question: "Bisakah mengatur transparansi warna?",
        answer:
          "Bisa. Atur nilai alfa untuk mendapatkan warna semi-transparan; hasil HEX, RGB, dan HSL akan mengikuti nilai tersebut.",
      },
      {
        question: "Bagaimana cara mengambil warna dari gambar?",
        answer:
          "Pilih gambar dari perangkat Anda pada menu Dari gambar, lalu klik titik yang ingin diambil pada preview. Tool juga membuat palet representatif dari gambar tersebut. Gambar dibaca secara lokal dan dibatasi maksimal 15 MB.",
      },
    ],
  },
  {
    slug: "image-to-webp",
    title: "Cara Kompres Gambar ke WebP di Browser Tanpa Unggah",
    intro:
      "Gambar ke WebP mengubah PNG atau JPG lokal menjadi WebP dengan kontrol kualitas dan batas dimensi. Cocok untuk memperkecil aset website tanpa mengunggah gambar ke server mana pun.",
    steps: [
      "Siapkan gambar PNG atau JPG dengan ukuran maksimal 15 MB.",
      "Buka tool Gambar ke WebP dan pilih berkas dari perangkat Anda.",
      "Atur kualitas dan batas dimensi sesuai kebutuhan.",
      "Proses gambar, lalu unduh hasil WebP yang muncul.",
    ],
    useCases: [
      "Memperkecil gambar untuk mempercepat halaman website.",
      "Menyiapkan foto produk dengan ukuran berkas lebih ringan.",
      "Mengompres aset blog sebelum diunggah ke CMS.",
      "Membuat lampiran gambar yang lebih kecil untuk email.",
    ],
    faq: [
      {
        question: "Apakah gambar saya diunggah ke server?",
        answer:
          "Tidak. Gambar dibaca dan diubah di browser Anda; tidak ada berkas yang dikirim atau disimpan di server LKTech.",
      },
      {
        question: "Berapa batas ukuran gambar?",
        answer:
          "Satu berkas gambar maksimal 15 MB. Tool akan menolak berkas yang melewati batas tersebut dengan pesan yang jelas.",
      },
      {
        question: "Bagaimana mengatur kualitas WebP?",
        answer:
          "Gunakan kontrol kualitas untuk memilih nilai antara 0,1 dan 1. Nilai sekitar 0,8 biasanya menjadi titik awal yang seimbang antara ukuran dan ketajaman.",
      },
      {
        question: "Apakah semua browser bisa menghasilkan WebP?",
        answer:
          "Browser modern umumnya mendukung encoder WebP. Tool memeriksa dukungan di browser Anda dan menampilkan pesan bila encoder tidak tersedia.",
      },
    ],
  },
  {
    slug: "image-to-pdf",
    title: "Gabung Gambar Jadi PDF di Browser (Tanpa Unggah)",
    intro:
      "Gambar ke PDF menyusun beberapa gambar menjadi satu dokumen PDF. Anda dapat mengatur urutan, ukuran halaman, dan margin sebelum mengunduh hasilnya. Seluruh proses berjalan lokal di browser.",
    steps: [
      "Pilih hingga 20 gambar dari perangkat Anda.",
      "Atur urutan gambar sesuai urutan halaman yang diinginkan.",
      "Pilih ukuran halaman A4, Letter, atau sesuaikan dengan gambar, lalu atur margin.",
      "Proses dan unduh berkas PDF gabungan.",
    ],
    useCases: [
      "Menggabungkan foto tugas atau dokumen menjadi satu PDF.",
      "Menyusun lampiran gambar untuk pendaftaran atau administrasi.",
      "Membuat portofolio sederhana dari beberapa gambar.",
      "Mengirim kumpulan gambar dalam satu berkas yang rapi.",
    ],
    faq: [
      {
        question: "Berapa jumlah gambar yang bisa digabung?",
        answer:
          "Satu proses mendukung hingga 20 gambar, dengan ukuran maksimal 15 MB per gambar.",
      },
      {
        question: "Format gambar apa yang didukung?",
        answer:
          "Tool menerima format gambar umum seperti PNG, JPG, WebP, GIF, BMP, dan AVIF. Validasi akhir dilakukan saat gambar dibaca di browser.",
      },
      {
        question: "Apakah saya bisa mengatur ukuran halaman PDF?",
        answer:
          "Bisa. Pilih A4, Letter, atau opsi sesuaikan dengan ukuran gambar. Margin dapat diatur untuk opsi halaman berukuran tetap.",
      },
      {
        question: "Apakah gambar atau PDF dikirim ke server?",
        answer:
          "Tidak. Gambar diproses dan PDF dibuat di browser Anda; tidak ada berkas yang diunggah atau disimpan di server.",
      },
    ],
  },
  {
    slug: "text-formatter",
    title: "Formatter JSON & Teks Online yang Berjalan Lokal",
    intro:
      "Formatter Teks merapikan JSON dengan indentasi pilihan, memadatkannya menjadi satu baris, atau membersihkan spasi dan baris kosong pada teks biasa. Isi teks tidak dikirim ke server.",
    steps: [
      "Tempel teks atau JSON ke area input.",
      "Pilih mode: rapikan JSON, minify JSON, atau bersihkan teks.",
      "Jalankan pemrosesan dan periksa hasilnya.",
      "Salin hasil atau unduh sebagai berkas teks/JSON.",
    ],
    useCases: [
      "Membaca respons API JSON yang masih satu baris.",
      "Merapikan konfigurasi JSON sebelum disimpan ke repositori.",
      "Membersihkan teks hasil salin-tempel dari spasi berlebih.",
      "Membuat versi minify JSON untuk kebutuhan transfer data.",
    ],
    faq: [
      {
        question: "Apakah teks saya diunggah ke server?",
        answer:
          "Tidak. Teks diproses di browser Anda dan tidak dikirim atau disimpan di server LKTech.",
      },
      {
        question: "Berapa batas panjang teks?",
        answer:
          "Input dibatasi 2 juta karakter per proses agar browser tetap responsif. Batas ini ditampilkan di tool.",
      },
      {
        question: "Apakah tool memvalidasi JSON?",
        answer:
          "Ya. Mode JSON akan menampilkan pesan kesalahan bila input bukan JSON yang valid, tanpa mengirim isi teks ke mana pun.",
      },
      {
        question: "Bisakah mengubah JSON menjadi satu baris?",
        answer:
          "Bisa. Gunakan mode minify untuk menghasilkan JSON tanpa indentasi dan baris baru.",
      },
    ],
  },
  {
    slug: "webp-to-image",
    title: "Ubah WebP ke PNG, JPG, GIF, BMP, atau AVIF",
    intro:
      "WebP ke Gambar mengubah satu WebP statis menjadi format gambar yang Anda pilih. File diproses lokal di browser; WebP animasi ditolak agar frame tidak hilang diam-diam.",
    steps: [
      "Pilih satu berkas WebP statis berukuran maksimal 15 MB.",
      "Tool memeriksa container dan dimensi gambar; batasnya 8 megapiksel.",
      "Pilih PNG, JPG, GIF, BMP, atau AVIF. Atur kualitas untuk JPG atau AVIF bila diperlukan.",
      "Jalankan konversi dan unduh hasil setelah pratinjau serta formatnya terverifikasi.",
    ],
    useCases: [
      "Membuat PNG dari WebP untuk mempertahankan transparansi.",
      "Menyimpan salinan JPG untuk aplikasi yang belum menerima WebP.",
      "Membuat GIF statis dengan palet warna terbatas.",
      "Menghasilkan BMP atau AVIF untuk alur kerja yang memerlukannya.",
    ],
    faq: [
      {
        question: "Apakah gambar saya diunggah ke server?",
        answer:
          "Tidak. Pembacaan, decode, dan konversi berlangsung lokal di browser Anda. Berkas tidak dikirim atau disimpan di server LKTech.",
      },
      {
        question: "Bisakah mengubah WebP animasi?",
        answer:
          "Belum. Tool menolak WebP animasi dengan pesan jelas agar frame tambahan tidak hilang tanpa pemberitahuan.",
      },
      {
        question: "Apa yang terjadi pada transparansi?",
        answer:
          "PNG dan AVIF mempertahankan alpha bila encoder mendukungnya. JPG dan BMP meratakan area transparan ke putih; GIF memakai transparansi satu tingkat dan palet maksimal 256 warna.",
      },
      {
        question: "Berapa batas file dan dimensi?",
        answer:
          "Satu WebP hingga 15 MB dan 8 megapiksel. Gambar yang melampaui batas tidak di-resize diam-diam.",
      },
      {
        question: "Mengapa AVIF pertama kali bisa lebih lama?",
        answer:
          "Encoder AVIF lokal perlu dimuat saat pertama kali digunakan. Setelah dimuat, hasil tetap dibuat di browser dan tidak mengirim gambar ke layanan eksternal.",
      },
    ],
  },
  {
    slug: "pdf-to-image",
    title: "Ubah PDF Jadi Gambar PNG/JPG di Browser",
    intro:
      "PDF ke Gambar merender halaman PDF menjadi gambar PNG atau JPG. Anda dapat memilih resolusi dan rentang halaman, lalu mengunduh gambar per halaman. PDF tidak diunggah ke server.",
    steps: [
      "Pilih berkas PDF dengan ukuran maksimal 25 MB.",
      "Tentukan format gambar (PNG atau JPG) dan resolusi render.",
      "Pilih rentang halaman yang ingin diubah.",
      "Render, lalu unduh gambar untuk setiap halaman.",
    ],
    useCases: [
      "Mengambil pratinjau halaman PDF untuk dokumentasi.",
      "Mengubah halaman tertentu menjadi gambar untuk presentasi.",
      "Membuat gambar dari materi PDF tanpa aplikasi tambahan.",
      "Menyiapkan thumbnail halaman PDF untuk keperluan web.",
    ],
    faq: [
      {
        question: "Berapa batas PDF yang bisa diproses?",
        answer:
          "Ukuran berkas maksimal 25 MB dan maksimal 30 halaman per proses. Untuk PDF yang lebih panjang, gunakan rentang halaman secara bertahap.",
      },
      {
        question: "Resolusi apa yang tersedia?",
        answer:
          "Tersedia pilihan 72 dpi (1×), 144 dpi (2×), dan 216 dpi (3×). Resolusi lebih tinggi menghasilkan gambar lebih tajam dengan ukuran berkas lebih besar.",
      },
      {
        question: "Apakah PDF saya diunggah?",
        answer:
          "Tidak. PDF dibaca dan dirender di browser Anda menggunakan pdf.js; tidak ada berkas yang dikirim atau disimpan di server.",
      },
      {
        question: "Apakah semua halaman langsung diunduh?",
        answer:
          "Hasil ditampilkan per halaman, sehingga Anda bisa mengunduh hanya halaman yang dibutuhkan.",
      },
    ],
  },
];

/** Cari panduan berdasarkan slug (case-insensitive). */
export function getToolGuide(slug: string): ToolGuide | null {
  const key = slug.trim().toLowerCase();
  return TOOL_GUIDES.find((guide) => guide.slug === key) ?? null;
}

/** Daftar slug panduan (untuk `generateStaticParams` & sitemap). */
export function toolGuideSlugs(): string[] {
  return TOOL_GUIDES.map((guide) => guide.slug);
}
