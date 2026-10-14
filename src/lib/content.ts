export const COMPANY = {
  name: "LKTech",
  tagline: "Teknologi Modern, Hasil Nyata",
  location: "Padakembang, Tasikmalaya, Jawa Barat",
  email: "lupyariestaa@gmail.com",
  year: 2026,
};

/** Navigasi khusus halaman dalam (footer). Navbar memakai `@/lib/nav`. */
export const PAGE_NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Layanan", href: "/layanan" },
  { label: "Produk", href: "/produk" },
  { label: "Harga", href: "/harga" },
  { label: "Promo", href: "/promo" },
  { label: "Portofolio", href: "/portofolio" },
  { label: "Tentang", href: "/tentang" },
  { label: "Blog", href: "/blog" },
  { label: "Kontak", href: "/kontak" },
];

export type Service = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  accent: string;
  waMessage: string;
};

export type ServiceFeature = {
  title: string;
  description: string;
  icon: string;
};

export type ServiceDeliverable = {
  title: string;
  description: string;
};

export type ServiceStep = {
  title: string;
  description: string;
};

export type ServiceFaq = {
  question: string;
  answer: string;
};

export type ServiceDetail = {
  slug: string;
  heroDescription: string;
  highlights: string[];
  deliverables: ServiceDeliverable[];
  features: ServiceFeature[];
  steps: ServiceStep[];
  techStack: string[];
  packages: { name: string; suitedFor: string; points: string[] }[];
  faqs: ServiceFaq[];
};

export type { ProjectMetric, Project } from "@/lib/project-types";

/**
 * Daftar proyek portofolio default (fallback & seed awal).
 * Catatan: konten bersifat contoh (placeholder realistis) untuk perusahaan
 * baru — akan diganti dengan proyek & studi kasus asli seiring berjalannya waktu.
 * Data aktual dibaca dari Firestore (lihat lib/projects.ts).
 */
export const PROJECTS: import("@/lib/project-types").Project[] = [
  {
    slug: "website-profil-kopi-lokal",
    title: "Website Profil & Katalog Kopi Lokal",
    client: "Kopi Lokal",
    category: "Website",
    serviceSlug: "pembuatan-website",
    year: 2026,
    summary:
      "Website profil dan katalog produk untuk kedai kopi lokal, lengkap dengan cerita brand dan pemesanan via WhatsApp.",
    cover: "kopi",
    accent: "from-[#004EDF] to-[#4D82EC]",
    tags: ["Website", "Katalog", "WhatsApp"],
    challenge:
      "Kopi Lokal belum punya kehadiran digital. Calon pelanggan kesulitan menemukan informasi menu, lokasi, dan cara memesan.",
    solution:
      "Kami membangun website profil yang cepat dengan katalog produk, cerita brand, integrasi peta lokasi, dan tombol pesan langsung ke WhatsApp dengan pesan otomatis.",
    results: [
      "Pemesanan lewat WhatsApp meningkat signifikan",
      "Brand terlihat lebih profesional dan terpercaya",
      "Informasi menu & lokasi mudah diakses pelanggan",
    ],
    metrics: [
      { label: "Waktu muat", value: "< 1,5s" },
      { label: "Skor performa", value: "95+" },
      { label: "Pengerjaan", value: "2 minggu" },
    ],
    techStack: ["Next.js", "Tailwind CSS", "Vercel"],
  },
  {
    slug: "aplikasi-absensi-sekolah",
    title: "Aplikasi Absensi & Informasi Sekolah",
    client: "EduMaju",
    category: "Aplikasi Mobile",
    serviceSlug: "aplikasi-mobile",
    year: 2026,
    summary:
      "Aplikasi mobile untuk absensi siswa dan penyampaian informasi sekolah kepada orang tua secara realtime.",
    cover: "edu",
    accent: "from-[#4D82EC] to-[#0A0F1E]",
    tags: ["Mobile", "Absensi", "Realtime"],
    challenge:
      "Sekolah mencatat absensi secara manual dan informasi ke orang tua tersampaikan lambat lewat grup pesan.",
    solution:
      "Kami membangun aplikasi lintas platform dengan absensi digital, notifikasi otomatis ke orang tua, dan dasbor ringkas untuk guru serta admin sekolah.",
    results: [
      "Pencatatan absensi jauh lebih cepat dan akurat",
      "Orang tua menerima informasi secara realtime",
      "Beban administrasi guru berkurang",
    ],
    metrics: [
      { label: "Platform", value: "Android & iOS" },
      { label: "Fitur inti", value: "6 modul" },
      { label: "Pengerjaan", value: "8 minggu" },
    ],
    techStack: ["React Native", "Expo", "Firebase"],
  },
  {
    slug: "toko-online-ritel-jaya",
    title: "Toko Online Ritel Jaya",
    client: "Ritel Jaya",
    category: "E-commerce",
    serviceSlug: "pembuatan-website",
    year: 2026,
    summary:
      "Platform toko online dengan katalog produk, keranjang, checkout, dan panel admin untuk mengelola pesanan.",
    cover: "ritel",
    accent: "from-[#003BB3] to-[#4D82EC]",
    tags: ["E-commerce", "Checkout", "Dashboard"],
    challenge:
      "Ritel Jaya berjualan hanya lewat toko fisik dan pesan pribadi, sehingga sulit berkembang dan melacak pesanan.",
    solution:
      "Kami membangun toko online lengkap dengan manajemen stok, keranjang, checkout, dan panel admin untuk memantau produk serta pesanan secara terpusat.",
    results: [
      "Jangkauan penjualan keluar dari area toko fisik",
      "Pengelolaan pesanan terpusat dan rapi",
      "Stok produk terpantau otomatis",
    ],
    metrics: [
      { label: "Produk awal", value: "120+" },
      { label: "Kanal", value: "Web" },
      { label: "Pengerjaan", value: "6 minggu" },
    ],
    techStack: ["Next.js", "Firebase", "Cloudinary"],
  },
  {
    slug: "identitas-brand-klinik-medika",
    title: "Identitas Brand Klinik Medika Sehat",
    client: "Medika Sehat",
    category: "Desain & Branding",
    serviceSlug: "desain-branding",
    year: 2026,
    summary:
      "Perancangan logo, palet warna, dan panduan brand untuk klinik kesehatan agar tampil bersih, tepercaya, dan konsisten.",
    cover: "medika",
    accent: "from-[#4D82EC] to-[#004EDF]",
    tags: ["Branding", "Logo", "Guideline"],
    challenge:
      "Klinik memiliki banyak cabang, namun identitas visual antar cabang tidak konsisten sehingga kesan profesional berkurang.",
    solution:
      "Kami menyusun identitas brand menyeluruh — logo, palet warna, tipografi, dan brand guideline — agar seluruh cabang tampil seragam dan tepercaya.",
    results: [
      "Identitas visual konsisten di semua cabang",
      "Kesan bersih dan profesional meningkat",
      "Materi promosi lebih mudah dibuat seragam",
    ],
    metrics: [
      { label: "Konsep awal", value: "3 arah" },
      { label: "Aset", value: "Logo + guideline" },
      { label: "Pengerjaan", value: "3 minggu" },
    ],
    techStack: ["Figma", "Adobe Illustrator", "Design System"],
  },
  {
    slug: "landing-page-webinar-edumaju",
    title: "Landing Page Webinar EduMaju",
    client: "EduMaju",
    category: "Landing Page",
    serviceSlug: "pembuatan-website",
    year: 2026,
    summary:
      "Landing page konversi untuk pendaftaran webinar, dengan alur persuasi dan formulir pendaftaran yang sederhana.",
    cover: "webinar",
    accent: "from-[#004EDF] to-[#003BB3]",
    tags: ["Landing Page", "Konversi", "Form"],
    challenge:
      "Pendaftaran webinar sebelumnya tersebar di banyak kanal, membuat calon peserta bingung dan data tidak terpusat.",
    solution:
      "Kami membangun landing page fokus dengan satu CTA jelas, formulir pendaftaran ringkas, dan struktur konten persuasif yang mengarah ke aksi.",
    results: [
      "Tingkat pendaftaran meningkat",
      "Data peserta terkumpul di satu tempat",
      "Alur pendaftaran jauh lebih sederhana",
    ],
    metrics: [
      { label: "Konversi naik", value: "+40%" },
      { label: "Waktu muat", value: "< 1s" },
      { label: "Pengerjaan", value: "1 minggu" },
    ],
    techStack: ["Next.js", "Tailwind CSS", "Form Handling"],
  },
  {
    slug: "dashboard-internal-nusantara",
    title: "Dashboard Internal Nusantara Co.",
    client: "Nusantara Co.",
    category: "Web App",
    serviceSlug: "konsultasi-teknologi",
    year: 2026,
    summary:
      "Dashboard internal untuk memantau data operasional, lengkap dengan autentikasi dan peran pengguna.",
    cover: "dashboard",
    accent: "from-[#0A0F1E] to-[#004EDF]",
    tags: ["Web App", "Dashboard", "Autentikasi"],
    challenge:
      "Tim internal mencatat data operasional di banyak file terpisah, sulit dipantau dan rawan tidak sinkron.",
    solution:
      "Kami bangun dashboard terpusat dengan autentikasi, peran pengguna, dan visualisasi data agar pengambilan keputusan lebih cepat.",
    results: [
      "Data operasional terpusat dan konsisten",
      "Pelaporan lebih cepat dan akurat",
      "Hak akses pengguna terkelola dengan baik",
    ],
    metrics: [
      { label: "Peran pengguna", value: "3 level" },
      { label: "Modul", value: "5 modul" },
      { label: "Pengerjaan", value: "7 minggu" },
    ],
    techStack: ["Next.js", "TypeScript", "Firebase Auth", "Firestore"],
  },
];

/**
 * Konten halaman "Tentang Kami" (`/tentang`). Statis & jujur — tanpa klaim angka
 * yang belum terverifikasi (lihat prinsip kejujuran `STATS`). Edit di sini bila
 * cerita/misi/visi/nilai berubah.
 */
export const ABOUT = {
  /** Paragraf cerita (ditampilkan berurutan). */
  story: [
    `${COMPANY.name} lahir dari kegelisahan sederhana: banyak bisnis lokal punya produk bagus, tetapi belum punya kehadiran digital yang layak. Kami hadir untuk menutup jarak itu.`,
    `Berbasis di ${COMPANY.location}, kami mengerjakan website, aplikasi mobile, dan konsultasi teknologi dengan pendekatan personal. Kami percaya solusi terbaik lahir dari pemahaman mendalam atas kebutuhan — bukan sekadar mengejar tren.`,
    `Nama kami menempel pada hasil, bukan pada janji. Setiap proyek dibangun rapi, aman, dan mudah dikembangkan, sehingga bisa tumbuh bersama bisnis Anda.`,
  ],
  mission:
    "Membantu bisnis dan individu bertumbuh lewat solusi digital yang tepat guna, terjangkau, dan berkualitas.",
  vision:
    "Menjadi mitra teknologi yang paling dipercaya bagi bisnis lokal di Indonesia — tempat ide digital berubah menjadi hasil nyata.",
  /** Nilai & prinsip kerja (tampil sebagai kartu di /tentang). */
  values: [
    {
      title: "Jujur & Transparan",
      description:
        "Harga, progres, dan rekomendasi teknis disampaikan apa adanya — tanpa jargun yang membingungkan.",
      icon: "shield",
    },
    {
      title: "Kualitas Tanpa Kompromi",
      description:
        "Kami menulis kode yang rapi, aman, dan mudah dirawat, agar produk Anda tahan lama.",
      icon: "code",
    },
    {
      title: "Berpusat pada Manusia",
      description:
        "Teknologi hanya alat. Tujuan akhirnya selalu: memudahkan orang dan menumbuhkan bisnis Anda.",
      icon: "heart",
    },
    {
      title: "Tepat Waktu",
      description:
        "Proses yang terstruktur dan komunikasi yang jelas membuat pekerjaan selesai sesuai kesepakatan.",
      icon: "zap",
    },
  ],
  /**
   * Prinsip teknis — "cara kami beda" saat membangun produk. Tampil sebagai
   * kartu di `/tentang`. Fokus pada standar kerja, bukan klaim angka.
   */
  principles: [
    {
      title: "Kode Bersih & Mudah Dirawat",
      description:
        "Struktur rapi, penamaan jelas, dan tanpa utang teknis tersembunyi — agar produk mudah dikembangkan siapa pun yang melanjutkan.",
      icon: "code",
    },
    {
      title: "Aman Sejak Awal",
      description:
        "Validasi di sisi server, data sensitif tidak pernah bocor, dan akses dijaga di setiap titik — bukan ditambal belakangan.",
      icon: "shield",
    },
    {
      title: "Cepat & Ringan",
      description:
        "Halaman dioptimalkan agar dimuat cepat di koneksi seadanya, karena kecepatan berpengaruh langsung pada pengalaman dan konversi.",
      icon: "zap",
    },
    {
      title: "Ramah Aksesibilitas",
      description:
        "Kontras layak, navigasi keyboard, dan konten yang terbaca — supaya semua orang bisa memakainya, bukan hanya sebagian.",
      icon: "heart",
    },
    {
      title: "Siap Tumbuh",
      description:
        "Fondasi yang tidak mengunci Anda: mudah menambah fitur, menyambung layanan, dan menyesuaikan saat kebutuhan berubah.",
      icon: "trending",
    },
    {
      title: "Terukur & Terpantau",
      description:
        "Kinerja dan kesalahan situs dipantau, sehingga masalah ketahuan lebih awal dan keputusan diambil berbasis data.",
      icon: "chartBar",
    },
  ],
  /** FAQ khusus halaman "Tentang Kami". */
  faqs: [
    {
      question: "Apa itu LKTech dan apa yang dikerjakan?",
      answer:
        "LKTech adalah rumah pengembangan digital yang mengerjakan pembuatan website, aplikasi mobile, dan konsultasi teknologi. Kami membantu bisnis dan individu mengubah kebutuhan menjadi produk digital yang benar-benar dipakai.",
    },
    {
      question: "LKTech melayani klien dari mana saja?",
      answer: `Berbasis di ${COMPANY.location}, kami mengerjakan proyek secara remote untuk klien di seluruh Indonesia. Komunikasi berjalan lewat WhatsApp, telepon, atau video call sesuai kesepakatan.`,
    },
    {
      question: "Bagaimana alur kerja sama LKTech?",
      answer:
        "Empat langkah ringkas: konsultasi kebutuhan, desain solusi, pengembangan, lalu rilis beserta dukungan. Anda tahu progres di setiap tahap — tanpa kejutan.",
    },
    {
      question: "Berapa lama pengerjaan sebuah proyek?",
      answer:
        "Durasi bergantung ruang lingkup. Sebelum mulai, kami beri estimasi waktu yang jelas setelah kebutuhan disepakati, dan kami pegang komitmen itu.",
    },
    {
      question: "Apakah ada dukungan setelah proyek selesai?",
      answer:
        "Ya. Kami menyediakan pendampingan awal setelah rilis — memastikan produk berjalan lancar dan membantu penyesuaian yang dibutuhkan. Penawaran dukungan lanjutan bisa dibicarakan sesuai kebutuhan.",
    },
    {
      question: "Bagaimana cara memulai kerja sama?",
      answer:
        "Cukup hubungi kami lewat WhatsApp atau halaman kontak. Ceritakan kebutuhan Anda, lalu kami bantu tentukan langkah dan solusi paling tepat — tanpa komitmen di awal.",
    },
  ],
} as const;

export const WHY_US = [
  {
    title: "Harga Kompetitif",
    description: "Penawaran bersahabat tanpa mengurangi kualitas hasil.",
    icon: "wallet",
  },
  {
    title: "Layanan Personal",
    description: "Komunikasi langsung dan pendampingan sesuai kebutuhan Anda.",
    icon: "handshake",
  },
  {
    title: "Kualitas & Clean Code",
    description: "Sistem dibangun rapi, aman, dan mudah dikembangkan.",
    icon: "code",
  },
  {
    title: "Cepat & Efisien",
    description: "Proses terstruktur dengan hasil tepat waktu.",
    icon: "zap",
  },
  {
    title: "Jujur & Transparan",
    description: "Harga, progres, dan rekomendasi teknis yang apa adanya.",
    icon: "shield",
  },
  {
    title: "Inovatif",
    description: "Mengadopsi teknologi terkini untuk solusi yang relevan.",
    icon: "sparkles",
  },
];

export const PROCESS = [
  {
    step: "01",
    title: "Konsultasi",
    description: "Kami mendengarkan kebutuhan, tujuan, dan tantangan bisnis Anda.",
  },
  {
    step: "02",
    title: "Desain",
    description: "Merancang solusi, alur, dan tampilan sesuai identitas brand Anda.",
  },
  {
    step: "03",
    title: "Pengembangan",
    description: "Membangun sistem dengan kode bersih dan standar terbaik.",
  },
  {
    step: "04",
    title: "Launch & Dukungan",
    description: "Rilis, pemantauan, dan pendampingan setelah produk berjalan.",
  },
];

export const STATS = [
  { value: 20, suffix: "+", label: "Proyek Dikerjakan" },
  { value: 15, suffix: "+", label: "Klien Puas" },
  { value: 3, suffix: "", label: "Layanan Inti" },
  { value: 100, suffix: "%", label: "Komitmen" },
];

/**
 * Teknologi yang kami gunakan — tampil sebagai marquee di beranda.
 *
 * Cara menambahkan logo asli (lihat `docs/SETUP-LOGO-TEKNOLOGI.md`):
 * 1. Simpan file logo di `public/tech/<nama-file>.svg` (atau .png).
 * 2. Isi field `logo` dengan path-nya, mis. "/tech/react.svg".
 *    Selama `logo` kosong, kartu memakai placeholder inisial + warna brand.
 */
export type TechItem = {
  name: string;
  /** Path logo di public/, mis. "/tech/react.svg". Kosong = pakai placeholder. */
  logo: string;
  /** Warna brand untuk placeholder & aksen saat logo belum dipasang. */
  color: string;
  /**
   * `true` bila SVG sudah memuat teks/nama brand di dalamnya.
   * Kartu akan menyembunyikan label nama (hanya menampilkan logo).
   */
  wordmark?: boolean;
};

export const TECH_STACK: TechItem[] = [
  { name: "React", logo: "/tech/react.svg", color: "#61DAFB" },
  { name: "Next.js", logo: "/tech/nextjs.svg", color: "#0A0F1E", wordmark: true },
  { name: "TypeScript", logo: "/tech/typescript.svg", color: "#3178C6" },
  { name: "JavaScript", logo: "/tech/javascript.svg", color: "#F7DF1E" },
  { name: "Tailwind CSS", logo: "/tech/tailwind-css.svg", color: "#06B6D4" },
  { name: "Bootstrap", logo: "/tech/bootstrap.svg", color: "#7952B3" },
  { name: "Vue", logo: "/tech/vuejs.svg", color: "#41B883" },
  { name: "Laravel", logo: "/tech/laravel.svg", color: "#FF2D20" },
  { name: "Node.js", logo: "/tech/nodejs.svg", color: "#5FA04E", wordmark: true },
  { name: "NestJS", logo: "/tech/nestjs.svg", color: "#E0234E" },
  { name: "Python", logo: "/tech/python.svg", color: "#3776AB" },
  { name: "Flutter", logo: "/tech/flutter.svg", color: "#02569B" },
  { name: "Firebase", logo: "/tech/firebase.svg", color: "#FFCA28", wordmark: true },
  { name: "PostgreSQL", logo: "/tech/postgresql-elephant.svg", color: "#4169E1" },
  { name: "Cloudinary", logo: "/tech/cloudinary.svg", color: "#3448C5", wordmark: true },
  { name: "Supabase", logo: "/tech/supabase.svg", color: "#3ECF8E", wordmark: true },
  { name: "Railway", logo: "/tech/railway.svg", color: "#100F13" },
  { name: "Vercel", logo: "/tech/vercel.svg", color: "#0A0F1E", wordmark: true },
  { name: "GitHub", logo: "/tech/github.svg", color: "#1B1F23" },
  { name: "Figma", logo: "/tech/figma.svg", color: "#F24E1E" },
];

export const PRICING = [
  {
    name: "Basic",
    description: "Cocok untuk UMKM dan personal yang baru memulai.",
    features: [
      "Website landing page / profil (1–5 halaman)",
      "Desain responsif (mobile & desktop)",
      "Optimasi dasar SEO & kecepatan",
      "Formulir kontak & tombol WhatsApp",
      "Revisi & dukungan awal",
    ],
    highlight: false,
  },
  {
    name: "Profesional",
    description: "Pilihan terbaik untuk bisnis yang berkembang.",
    features: [
      "Website / web app lengkap (6–15 halaman)",
      "Kustom desain & UI/UX sesuai brand",
      "Optimasi performa & SEO lanjutan",
      "Integrasi WhatsApp, form & panel admin",
      "Dukungan prioritas",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    description: "Solusi custom untuk kebutuhan kompleks.",
    features: [
      "Aplikasi mobile & web",
      "Arsitektur & integrasi sistem custom",
      "Konsultasi teknologi menyeluruh",
      "Keamanan, skalabilitas & pemantauan",
      "Maintenance & pendampingan berkala",
    ],
    highlight: false,
  },
];

export const FAQS = [
  {
    question: "Berapa lama proses pembuatan website?",
    answer:
      "Bergantung pada kompleksitas. Landing page umumnya 1–2 minggu, sedangkan website atau aplikasi yang lebih kompleks bisa 3–8 minggu. Estimasi pasti akan kami berikan setelah sesi konsultasi.",
  },
  {
    question: "Apakah ada garansi atau maintenance?",
    answer:
      "Ya. Kami memberikan dukungan awal dan opsi maintenance berkala untuk perawatan, update, serta perbaikan sistem agar tetap optimal.",
  },
  {
    question: "Bagaimana cara pembayarannya?",
    answer:
      "Pembayaran dilakukan bertahap menyesuaikan tahap pengerjaan. Detail skema akan disepakati bersama sebelum proyek dimulai secara transparan.",
  },
  {
    question: "Bisakah memesan fitur khusus?",
    answer:
      "Tentu. Kami melayani kebutuhan custom sesuai alur bisnis Anda. Silakan sampaikan kebutuhan lewat konsultasi, kami akan berikan rekomendasi terbaik.",
  },
  {
    question: "Apakah bisa konsultasi dulu sebelum memesan?",
    answer:
      "Sangat bisa, dan kami sarankan. Konsultasi awal gratis untuk memahami kebutuhan Anda sebelum mengambil keputusan.",
  },
];
