/**
 * Data LOKASI/kota untuk programmatic SEO (fase S5).
 *
 * ⚠️ PRINSIP ANTI-DOORWAY (penting):
 * Setiap kota WAJIB punya konten UNIK & NYATA (bukan template dengan nama kota
 * ditukar). Field seperti `localContext`, `industries`, `whyLocal`, `localFaqs`
 * diisi manual per kota agar setiap halaman punya nilai jujur bagi pengguna.
 *
 * Mulai dari daftar terkurasi (kualitas > kuantitas) agar tidak dipandang Google
 * sebagai halaman tipis/doorway.
 *
 * Bebas impor runtime agar dapat diuji Node.
 */

export type LocalFaq = { question: string; answer: string };

export type Location = {
  /** Slug URL (mis. "tasikmalaya"). */
  slug: string;
  /** Nama tampilan (mis. "Tasikmalaya"). */
  name: string;
  /** Provinsi (untuk konteks & breadcrumb). */
  province: string;
  /** Paragraf konteks lokal UNIK (1–2 paragraf; sifat & kebutuhan digital kota). */
  localContext: string;
  /** 3–5 industri/segmen dominan kota ini (konteks relevansi layanan). */
  industries: string[];
  /** Poin "kenapa LKTech untuk kota ini" — spesifik, bukan klise. */
  whyLocal: string[];
  /** FAQ lokal unik (mis. waktu respons, pertemuan, zona waktu). */
  localFaqs: LocalFaq[];
  /** Kota-kota sekitar (slug) untuk internal linking regional. */
  nearby?: string[];
};

/**
 * Daftar kota terkurasi (fase S5). Prioritas: kota asal (Tasikmalaya) + kota
 * besar di Jawa Barat & Jakarta yang paling relevan dengan layanan LKTech.
 *
 * Menambah kota: pastikan kontennya BENAR-BENAR unik (bukan sekadar ganti nama).
 */
export const LOCATIONS: Location[] = [
  {
    slug: "tasikmalaya",
    name: "Tasikmalaya",
    province: "Jawa Barat",
    localContext:
      "Tasikmalaya adalah basis kami — kota dengan denyut UMKM yang kuat, dari sentra kerajinan, kuliner oleh-oleh, hingga pertanian dan pendidikan. Banyak usaha di sini tumbuh dari bisnis keluarga yang dipercaya karena kualitas, tetapi belum punya kanal digital yang serius untuk menjangkau pembeli di luar kota.",
    industries: ["UMKM kerajinan & fashion", "Kuliner & oleh-oleh", "Pendidikan (sekolah & kursus)", "Pertanian & agribisnis"],
    whyLocal: [
      "Kami berbasis di Padakembang, Tasikmalaya — bisa ketemu langsung, bukan hanya online",
      "Paham karakter pembeli lokal: WhatsApp masih raja, tetapi pembeli luar kota butuh lihat katalog & harga online",
      "Jangkauan jaringan lokal Tasikmalaya untuk referensi & kolaborasi",
    ],
    localFaqs: [
      { question: "Apakah bisa ketemuan langsung di Tasikmalaya?", answer: "Bisa. Karena kami berbasis di Tasikmalaya, pertemuan tatap muka bisa dijadwalkan untuk diskusi kebutuhan proyek." },
      { question: "Berapa lama respons untuk klien di Tasikmalaya?", answer: "Karena zona waktu & lokasi sama (WIB, Tasikmalaya), respons biasanya di hari yang sama di jam kerja." },
    ],
    nearby: ["bandung", "garut", "cirebon"],
  },
  {
    slug: "bandung",
    name: "Bandung",
    province: "Jawa Barat",
    localContext:
      "Bandung adalah hub kreatif Jawa Barat — penuh brand fashion, agensi, kafe, dan startup yang bersaing secara visual. Untuk menang di pasar yang sudah digital-savvy ini, bisnis di Bandung butuh website & aplikasi yang bukan sekadar online, tapi cepat, estetis, dan mampu bersaing dari sisi pengalaman pengguna.",
    industries: ["Brand fashion & D2C", "F&B, kafe & restoran", "Agensi & jasa kreatif", "Startup & teknologi"],
    whyLocal: [
      "Pengalaman membangun web/app untuk brand yang butuh diferensiasi visual",
      "Standar performa tinggi (Core Web Vitals) — penting karena audiens Bandung mobile-first",
      "Kolaborasi remote-friendly dengan sejumlah klien di Bandung Raya",
    ],
    localFaqs: [
      { question: "Bisa mengerjakan proyek untuk klien di Bandung secara remote?", answer: "Ya. Proses bisa 100% remote (meeting online, update berkala), atau tatap muka bila diperlukan." },
      { question: "Apakah harga disesuaikan dengan pasar Bandung?", answer: "Harga transparan & fleksibel mengikuti ruang lingkup, bukan lokasi. Anda bisa bandingkan paket di halaman harga." },
    ],
    nearby: ["tasikmalaya", "jakarta", "garut"],
  },
  {
    slug: "jakarta",
    name: "Jakarta",
    province: "DKI Jakarta",
    localContext:
      "Jakarta adalah pusat bisnis nasional dengan tempo tinggi dan persaingan ketat. Perusahaan di Jakarta butuh sistem digital yang andal, aman, dan bisa skala — dari web korporat, aplikasi internal, hingga platform transaksi. Keputusan beli sering melibatkan tim (bukan satu orang), sehingga komunikasi & dokumentasi rapi menjadi nilai utama.",
    industries: ["Korporat & enterprise", "E-commerce & retail", "Jasa profesional & konsultan", "Teknologi & fintech"],
    whyLocal: [
      "Menjaga kualitas enterprise: keamanan, performa, dan pemeliharaan jangka panjang",
      "Komunikasi terstruktur cocok untuk proyek multi-stakeholder",
      "Fokus pada hasil bisnis terukur, bukan hanya desain",
    ],
    localFaqs: [
      { question: "Bisa menangani proyek skala perusahaan di Jakarta?", answer: "Bisa. Kami menyesuaikan proses (dokumentasi, milestone, review) untuk kebutuhan tim/perusahaan." },
      { question: "Bagaimana koordinasi zona waktu & rapat?", answer: "WIB sama dengan Jakarta; rapat bisa dijadwalkan di jam kerja tanpa perbedaan zona waktu." },
    ],
    nearby: ["bandung", "bogor", "bekasi"],
  },
  {
    slug: "garut",
    name: "Garut",
    province: "Jawa Barat",
    localContext:
      "Garut terkenal dengan agribisnis (sayur, kopi, kulit), wisata alam, dan industri kreatif yang tumbuh. Banyak pelaku usaha Garut punya produk berkualitas tetapi bergantung pada penjualan offline & mulut ke mulut — peluang besar untuk masuk pasar nasional lewat toko online & branding digital yang tepat.",
    industries: ["Agribisnis & kopi", "Industri kulit & kerajinan", "Wisata & penginapan", "Kuliner (dodol, oleh-oleh)"],
    whyLocal: [
      "Dekat secara geografis dengan Tasikmalaya — pendampingan lokal lebih mudah",
      "Tepat untuk UMKM yang ingin naik kelas ke penjualan online",
      "Pendekatan hemat biaya untuk usaha yang baru mulai digital",
    ],
    localFaqs: [
      { question: "Cocok untuk UMKM Garut yang baru mulai online?", answer: "Sangat cocok. Kami biasa mulai dari landing page atau toko online sederhana dulu, lalu dikembangkan bertahap." },
      { question: "Apakah bisa dikunjungi untuk survei kebutuhan?", answer: "Untuk area Priangan Timur (Garut–Tasikmalaya), kunjungan bisa diatur sesuai kesepakatan." },
    ],
    nearby: ["tasikmalaya", "bandung"],
  },
  {
    slug: "cirebon",
    name: "Cirebon",
    province: "Jawa Barat",
    localContext:
      "Cirebon adalah simpul ekonomi pesisir utara Jawa Barat dengan perdagangan, kuliner khas, dan industri yang beragam. Sebagai kota pelabuhan & jalur utama pantura, banyak pelaku usaha Cirebon melayani pembeli lintas kota — sehingga kehadiran digital yang meyakinkan (katalog, info harga, kredibilitas) menjadi penting.",
    industries: ["Perdagangan & distribusi", "Kuliner & oleh-oleh", "Industri & manufaktur", "Jasa & properti"],
    whyLocal: [
      "Paham kebutuhan usaha pantura yang melayani pembeli lintas kota",
      "Website sebagai etalase kredibilitas untuk klien B2B",
      "Dukungan remote & tatap muka sesuai kebutuhan",
    ],
    localFaqs: [
      { question: "Bisakah website membantu penjualan B2B di Cirebon?", answer: "Bisa. Website company profile + katalog produk membantu membangun kepercayaan sebelum negosiasi langsung." },
      { question: "Apakah melayani juga kota sekitar Cirebon?", answer: "Ya, termasuk area Ciayumajakuning (Cirebon, Indramayu, Majalengka, Kuningan)." },
    ],
    nearby: ["tasikmalaya", "bandung"],
  },
  {
    slug: "bogor",
    name: "Bogor",
    province: "Jawa Barat",
    localContext:
      "Bogor menggabungkan karakter kota penyangga Jakarta dengan basis agribisnis, pendidikan (banyak sekolah & kampus), serta wisata. Permintaan akan sistem digital di Bogor tinggi — mulai dari sekolah yang butuh portal informasi, UMKM kuliner, hingga bisnis wisata yang ingin terlihat profesional di mesin pencari.",
    industries: ["Pendidikan & sekolah", "Agribisnis & hortikultura", "Wisata & kuliner", "Properti & jasa"],
    whyLocal: [
      "Pengalaman membangun situs untuk institusi pendidikan & bisnis wisata",
      "Desain yang bersih & ramah SEO untuk bersaing di area Jabodetabek",
      "Opsi remote atau tatap muka (Bogor relatif dekat)",
    ],
    localFaqs: [
      { question: "Bisa membuat website sekolah di Bogor?", answer: "Bisa. Kami biasa membangun profil sekolah, berita, PPDB online, dan galeri kegiatan." },
      { question: "Bagaimana dengan kecepatan & SEO untuk area Jabodetabek?", answer: "Kami mengutamakan performa dan struktur SEO agar halaman mudah ditemukan di pencarian lokal." },
    ],
    nearby: ["jakarta", "bekasi", "bandung"],
  },
  {
    slug: "bekasi",
    name: "Bekasi",
    province: "Jawa Barat",
    localContext:
      "Bekasi adalah kawasan industri & hunian besar di timur Jakarta, padat dengan pabrik, pergudangan, dan UMKM yang melayani pekerja. Bisnis di Bekasi sering butuh sistem yang praktis — katalog produk, sistem pemesanan, atau aplikasi internal untuk operasional yang serba cepat.",
    industries: ["Industri & manufaktur", "Logistik & pergudangan", "UMKM kuliner & jasa", "Retail & e-commerce"],
    whyLocal: [
      "Solusi praktis untuk operasional bisnis yang bergerak cepat",
      "Pengalaman sistem katalog & pemesanan untuk retail",
      "Remote-friendly, cocok untuk bisnis dengan mobilitas tinggi",
    ],
    localFaqs: [
      { question: "Bisa membuat sistem pemesanan online untuk UMKM Bekasi?", answer: "Bisa. Mulai dari toko online sederhana hingga alur pemesanan khusus sesuai bisnis Anda." },
      { question: "Apakah mendukung integrasi pembayaran?", answer: "Ya, kami mendukung pembayaran online (QRIS/VA) sehingga transaksi bisa otomatis." },
    ],
    nearby: ["jakarta", "bogor"],
  },
  {
    slug: "cimahi",
    name: "Cimahi",
    province: "Jawa Barat",
    localContext:
      "Cimahi, kota kecil padat di barat Bandung, dikenal sebagai kota militer & pendidikan dengan industri kreatif yang tumbuh. Ukurannya yang ringkas membuat bisnis di Cimahi andalkan reputasi lokal — dan website yang rapi membantu mereka tampil lebih profesional sekaligus menjangkau Bandung Raya.",
    industries: ["Industri kreatif", "Pendidikan & kursus", "Kuliner & retail", "Jasa lokal"],
    whyLocal: [
      "Cocok untuk bisnis yang ingin tampil profesional di Bandung Raya",
      "Solusi ringkas & terjangkau untuk usaha skala kecil-menengah",
      "Dukungan lokal di Priangan",
    ],
    localFaqs: [
      { question: "Apakah website membantu bisnis kecil di Cimahi?", answer: "Ya. Website membangun kepercayaan dan memudahkan calon pelanggan menemukan serta menghubungi Anda." },
      { question: "Bisa mulai dari paket sederhana?", answer: "Bisa. Anda bisa mulai dari landing page, lalu dikembangkan seiring pertumbuhan usaha." },
    ],
    nearby: ["bandung", "jakarta"],
  },
];

/** Peta slug → lokasi untuk pencarian cepat. */
const LOCATIONS_MAP: Record<string, Location> = Object.fromEntries(
  LOCATIONS.map((l) => [l.slug, l]),
);

/** Ambil satu lokasi berdasarkan slug. */
export function getLocation(slug: string): Location | undefined {
  return LOCATIONS_MAP[slug];
}

/** Daftar slug lokasi (untuk `generateStaticParams`). */
export function getLocationSlugs(): string[] {
  return LOCATIONS.map((l) => l.slug);
}

/** `true` bila slug adalah kota terkurasi. */
export function isKnownLocation(slug: string): boolean {
  return slug in LOCATIONS_MAP;
}
