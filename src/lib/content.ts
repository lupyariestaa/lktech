import { WA_MESSAGES } from "@/lib/whatsapp";

export const COMPANY = {
  name: "LKTech",
  tagline: "Teknologi Modern, Hasil Nyata",
  location: "Padakembang, Tasikmalaya, Jawa Barat",
  email: "lupyariestaa@gmail.com",
  year: 2026,
};

export const NAV_LINKS = [
  { label: "Beranda", href: "/#beranda" },
  { label: "Layanan", href: "/#layanan" },
  { label: "Portofolio", href: "/portofolio" },
  { label: "Blog", href: "/blog" },
  { label: "Harga", href: "/#harga" },
  { label: "FAQ", href: "/#faq" },
];

/** Navigasi khusus halaman dalam (path-based). */
export const PAGE_NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Layanan", href: "/layanan" },
  { label: "Portofolio", href: "/portofolio" },
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

export const SERVICES: Service[] = [
  {
    slug: "pembuatan-website",
    title: "Pembuatan Website",
    tagline: "Website cepat, responsif, dan siap konversi.",
    description:
      "Website profil perusahaan, landing page, toko online, hingga web aplikasi yang cepat dan responsif.",
    icon: "globe",
    accent: "from-[#004EDF] to-[#4D82EC]",
    waMessage: WA_MESSAGES.website,
  },
  {
    slug: "aplikasi-mobile",
    title: "Aplikasi Mobile",
    tagline: "Aplikasi Android & iOS dengan pengalaman mulus.",
    description:
      "Aplikasi Android & iOS untuk kebutuhan bisnis dan layanan publik dengan pengalaman pengguna yang mulus.",
    icon: "smartphone",
    accent: "from-[#4D82EC] to-[#0A0F1E]",
    waMessage: WA_MESSAGES.mobile,
  },
  {
    slug: "konsultasi-teknologi",
    title: "Konsultasi Teknologi",
    tagline: "Arah teknologi yang tepat untuk bisnis Anda.",
    description:
      "Pendampingan arsitektur, pemilihan teknologi, dan strategi transformasi digital untuk bisnis Anda.",
    icon: "compass",
    accent: "from-[#004EDF] to-[#003BB3]",
    waMessage: WA_MESSAGES.consultant,
  },
  {
    slug: "desain-branding",
    title: "Desain & Branding",
    tagline: "Identitas visual yang profesional dan berkesan.",
    description:
      "Pembuatan logo, identitas brand, dan desain UI/UX yang membuat bisnis Anda tampil profesional.",
    icon: "palette",
    accent: "from-[#4D82EC] to-[#004EDF]",
    waMessage: WA_MESSAGES.general,
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    tagline: "Jangkau lebih banyak pelanggan potensial.",
    description:
      "Pengelolaan konten dan pemasaran digital untuk menjangkau lebih banyak pelanggan potensial.",
    icon: "megaphone",
    accent: "from-[#003BB3] to-[#4D82EC]",
    waMessage: WA_MESSAGES.general,
  },
];

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

export const SERVICES_DETAIL: ServiceDetail[] = [
  {
    slug: "pembuatan-website",
    heroDescription:
      "Kami membangun website yang bukan sekadar tampil cantik, tapi cepat, aman, ramah SEO, dan dirancang untuk mengubah pengunjung menjadi pelanggan. Cocok untuk profil perusahaan, landing page, toko online, hingga web aplikasi.",
    highlights: [
      "Desain custom sesuai identitas brand",
      "Mobile-first & responsif di semua ukuran layar",
      "Skor performa tinggi (Core Web Vitals)",
      "Siap dikembangkan seiring pertumbuhan bisnis",
    ],
    deliverables: [
      {
        title: "Website Profil Perusahaan",
        description:
          "Company profile modern yang membangun kredibilitas dan memudahkan calon klien mengenal bisnis Anda.",
      },
      {
        title: "Landing Page Konversi",
        description:
          "Halaman fokus dengan alur persuasi dan CTA yang dirancang untuk mendorong satu aksi utama.",
      },
      {
        title: "Toko Online (E-commerce)",
        description:
          "Katalog produk, keranjang, checkout, hingga integrasi pembayaran dan pengiriman.",
      },
      {
        title: "Web Aplikasi & Dashboard",
        description:
          "Sistem berbasis web: panel admin, manajemen data, autentikasi, dan integrasi API.",
      },
    ],
    features: [
      {
        title: "Performa Cepat",
        description:
          "Optimasi gambar, lazy-load, dan caching agar halaman terbuka dalam hitungan detik.",
        icon: "zap",
      },
      {
        title: "SEO Friendly",
        description:
          "Struktur semantik, metadata, sitemap, dan skor Lighthouse yang membantu peringkat di Google.",
        icon: "globe",
      },
      {
        title: "Aman & Terkelola",
        description:
          "Praktik keamanan standar, backup, dan kemudahan pembaruan konten.",
        icon: "shield",
      },
      {
        title: "Integrasi WhatsApp",
        description:
          "Tombol chat langsung dengan pesan otomatis siap pakai untuk mempercepat follow-up klien.",
        icon: "heart",
      },
    ],
    steps: [
      {
        title: "Discovery & Brief",
        description:
          "Kami pelajari tujuan bisnis, audiens, dan referensi yang Anda sukai.",
      },
      {
        title: "Wireframe & Desain UI",
        description:
          "Menyusun struktur halaman dan desain visual untuk persetujuan Anda.",
      },
      {
        title: "Pengembangan",
        description:
          "Kode rapi dan responsif dibangun, lalu diuji di berbagai perangkat.",
      },
      {
        title: "Launch & Dukungan",
        description:
          "Website dionlinekan, plus pendampingan dan opsi maintenance.",
      },
    ],
    techStack: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Firebase",
      "Vercel",
    ],
    packages: [
      {
        name: "Basic",
        suitedFor: "UMKM & personal yang baru memulai",
        points: [
          "Landing page / profil (1–5 halaman)",
          "Desain responsif",
          "Optimasi SEO dasar",
          "Integrasi WhatsApp",
        ],
      },
      {
        name: "Professional",
        suitedFor: "Bisnis yang berkembang",
        points: [
          "Website / web app lengkap",
          "Desain custom & UI/UX",
          "Form + integrasi WhatsApp",
          "Optimasi performa & SEO",
        ],
      },
      {
        name: "Custom",
        suitedFor: "Kebutuhan kompleks & e-commerce",
        points: [
          "E-commerce / sistem custom",
          "Integrasi pembayaran & API",
          "Panel admin & autentikasi",
          "Maintenance & pendampingan",
        ],
      },
    ],
    faqs: [
      {
        question: "Berapa lama pengerjaan sebuah website?",
        answer:
          "Landing page umumnya 1–2 minggu, website profil 2–4 minggu, sedangkan e-commerce atau web aplikasi bisa 4–8 minggu tergantung kompleksitas.",
      },
      {
        question: "Apakah termasuk domain dan hosting?",
        answer:
          "Kami bantu proses pembelian dan konfigurasi domain serta hosting. Biaya domain/hosting dibayarkan langsung ke penyedia, transparan tanpa markup.",
      },
      {
        question: "Apakah saya bisa update konten sendiri?",
        answer:
          "Bisa. Kami sediakan panel admin sederhana atau CMS sesuai kebutuhan, plus panduan singkat penggunaannya.",
      },
    ],
  },
  {
    slug: "aplikasi-mobile",
    heroDescription:
      "Kami merancang dan membangun aplikasi Android & iOS yang cepat, stabil, dan disukai pengguna — dari aplikasi bisnis, layanan publik, hingga produk digital. Fokus pada pengalaman pengguna dan kemudahan pengembangan jangka panjang.",
    highlights: [
      "Satu basis kode untuk Android & iOS",
      "UI/UX yang intuitif dan konsisten",
      "Performa ringan & hemat baterai",
      "Siap diintegrasikan dengan sistem Anda",
    ],
    deliverables: [
      {
        title: "Aplikasi Bisnis Internal",
        description:
          "Absensi, pencatatan, laporan, dan alur kerja tim dalam satu aplikasi.",
      },
      {
        title: "Aplikasi Layanan Publik",
        description:
          "Layanan informasi dan interaksi bagi pelanggan, warga, atau anggota Anda.",
      },
      {
        title: "Marketplace & Komunitas",
        description:
          "Aplikasi dengan akun pengguna, konten dinamis, notifikasi, dan pembayaran.",
      },
      {
        title: "MVP Produk Digital",
        description:
          "Versi awal produk untuk validasi ide dengan cepat dan hemat biaya.",
      },
    ],
    features: [
      {
        title: "Lintas Platform",
        description:
          "Dibangun sekali, berjalan di Android & iOS untuk menghemat waktu dan biaya.",
        icon: "smartphone",
      },
      {
        title: "UX yang Mulus",
        description:
          "Animasi halus, navigasi jelas, dan alur yang terasa natural bagi pengguna.",
        icon: "sparkles",
      },
      {
        title: "Notifikasi & Realtime",
        description:
          "Push notification dan data realtime agar pengguna selalu terhubung.",
        icon: "bell",
      },
      {
        title: "Siap Skala",
        description:
          "Arsitektur modular yang mudah ditambah fitur seiring pertumbuhan produk.",
        icon: "trending",
      },
    ],
    steps: [
      {
        title: "Riset & Perencanaan",
        description: "Mendefinisikan fitur inti, alur pengguna, dan prioritas MVP.",
      },
      {
        title: "Desain Prototype",
        description: "Membuat prototipe UI interaktif untuk diuji lebih awal.",
      },
      {
        title: "Pengembangan & Testing",
        description: "Membangun aplikasi dan mengujinya di berbagai perangkat.",
      },
      {
        title: "Rilis & Iterasi",
        description: "Publikasi ke store, pemantauan, dan penambahan fitur lanjutan.",
      },
    ],
    techStack: [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase",
      "REST API",
      "Google Play / App Store",
    ],
    packages: [
      {
        name: "MVP",
        suitedFor: "Validasi ide dengan cepat",
        points: [
          "Fitur inti terbatas",
          "1 platform prioritas",
          "Desain dasar",
          "Dukungan awal",
        ],
      },
      {
        name: "Bisnis",
        suitedFor: "Operasional & layanan",
        points: [
          "Android & iOS",
          "Akun & manajemen data",
          "Notifikasi",
          "Panel admin",
        ],
      },
      {
        name: "Custom",
        suitedFor: "Produk kompleks",
        points: [
          "Fitur lanjutan & integrasi",
          "Pembayaran & API pihak ketiga",
          "Analitik & pelaporan",
          "Maintenance berkala",
        ],
      },
    ],
    faqs: [
      {
        question: "Apakah aplikasi bisa dirilis ke Google Play & App Store?",
        answer:
          "Ya. Kami bantu proses publikasi ke kedua store, termasuk penyiapan akun developer dan kebutuhan aset aplikasi.",
      },
      {
        question: "Berapa lama pembuatan aplikasi mobile?",
        answer:
          "MVP sederhana bisa 4–8 minggu, sedangkan aplikasi bisnis yang lengkap umumnya 2–4 bulan tergantung jumlah fitur.",
      },
      {
        question: "Bisakah aplikasi terhubung dengan website saya?",
        answer:
          "Tentu. Aplikasi dapat berbagi data dan API dengan website Anda sehingga ekosistem digital terintegrasi.",
      },
    ],
  },
  {
    slug: "konsultasi-teknologi",
    heroDescription:
      "Bingung memilih teknologi, menyusun roadmap, atau membenahi sistem yang berjalan? Kami membantu Anda mengambil keputusan teknologi yang tepat — jujur, transparan, dan berorientasi pada tujuan bisnis.",
    highlights: [
      "Analisis kebutuhan & sistem saat ini",
      "Rekomendasi arsitektur & teknologi",
      "Roadmap digital yang realistis",
      "Pendampingan implementasi",
    ],
    deliverables: [
      {
        title: "Audit Teknologi",
        description:
          "Menilai kondisi sistem, keamanan, performa, dan biaya yang sedang berjalan.",
      },
      {
        title: "Penyusunan Roadmap",
        description:
          "Rencana transformasi digital bertahap dengan prioritas yang jelas.",
      },
      {
        title: "Pemilihan Arsitektur",
        description:
          "Rekomendasi teknologi, framework, dan infrastruktur sesuai skala bisnis.",
      },
      {
        title: "Pendampingan Tim",
        description:
          "Membantu tim internal atau vendor Anda mengeksekusi rencana dengan benar.",
      },
    ],
    features: [
      {
        title: "Jujur & Netral",
        description:
          "Rekomendasi berdasarkan kebutuhan Anda, bukan kepentingan penjualan tertentu.",
        icon: "shield",
      },
      {
        title: "Berorientasi Bisnis",
        description:
          "Solusi teknologi selalu dikaitkan dengan tujuan dan anggaran bisnis.",
        icon: "compass",
      },
      {
        title: "Berbasis Data",
        description:
          "Setiap saran didukung analisis kebutuhan dan kondisi nyata sistem.",
        icon: "chartBar",
      },
      {
        title: "Jelas & Praktis",
        description:
          "Disampaikan dengan bahasa yang mudah dipahami, bukan jargon saja.",
        icon: "sparkles",
      },
    ],
    steps: [
      {
        title: "Konsultasi Awal",
        description:
          "Sesi gratis untuk memahami tujuan, kendala, dan kondisi bisnis Anda.",
      },
      {
        title: "Analisis",
        description:
          "Kami pelajari sistem dan kebutuhan lalu menyusun temuan.",
      },
      {
        title: "Rekomendasi",
        description:
          "Menyampaikan opsi solusi beserta estimasi dampak dan biaya.",
      },
      {
        title: "Pendampingan",
        description:
          "Membantu eksekusi dan evaluasi agar hasil sesuai rencana.",
      },
    ],
    techStack: [
      "Cloud (AWS/GCP/Firebase)",
      "Arsitektur Sistem",
      "Keamanan Informasi",
      "DevOps",
      "Automasi Proses",
    ],
    packages: [
      {
        name: "Sesi Konsultasi",
        suitedFor: "Butuh arahan cepat",
        points: [
          "1–2 sesi diskusi",
          "Ringkasan rekomendasi",
          "Tanya jawab",
        ],
      },
      {
        name: "Audit & Roadmap",
        suitedFor: "Perencanaan serius",
        points: [
          "Analisis sistem",
          "Dokumen roadmap",
          "Estimasi biaya & waktu",
        ],
      },
      {
        name: "Pendampingan",
        suitedFor: "Implementasi end-to-end",
        points: [
          "Audit & roadmap",
          "Supervisi implementasi",
          "Evaluasi berkala",
        ],
      },
    ],
    faqs: [
      {
        question: "Apakah konsultasi awal benar-benar gratis?",
        answer:
          "Ya. Sesi konsultasi awal gratis untuk memahami kebutuhan Anda tanpa komitmen apa pun.",
      },
      {
        question: "Apakah bisa dilakukan secara online?",
        answer:
          "Bisa. Konsultasi dilakukan secara online melalui video call maupun chat sesuai kenyamanan Anda.",
      },
      {
        question: "Apakah hasil konsultasi bersifat mengikat?",
        answer:
          "Tidak. Rekomendasi kami bersifat saran terbaik untuk Anda, dan Anda bebas memutuskan langkah selanjutnya.",
      },
    ],
  },
  {
    slug: "desain-branding",
    heroDescription:
      "Identitas visual adalah kesan pertama bisnis Anda. Kami merancang logo, sistem brand, dan antarmuka UI/UX yang membuat bisnis Anda tampil profesional, konsisten, dan mudah diingat.",
    highlights: [
      "Logo & identitas brand yang khas",
      "Panduan penggunaan brand (guideline)",
      "Desain UI/UX untuk web & aplikasi",
      "Aset siap pakai untuk semua media",
    ],
    deliverables: [
      {
        title: "Desain Logo",
        description:
          "Logo utama beserta varian warna dan monokrom untuk berbagai kebutuhan.",
      },
      {
        title: "Identitas Brand",
        description:
          "Palet warna, tipografi, dan elemen visual yang menyatu membentuk karakter brand.",
      },
      {
        title: "Brand Guideline",
        description:
          "Panduan penggunaan agar brand tetap konsisten di semua kanal.",
      },
      {
        title: "Desain UI/UX",
        description:
          "Antarmuka website atau aplikasi yang indah dan mudah digunakan.",
      },
    ],
    features: [
      {
        title: "Khas & Relevan",
        description:
          "Desain mencerminkan karakter bisnis Anda dan beda dari kompetitor.",
        icon: "palette",
      },
      {
        title: "Konsisten",
        description:
          "Sistem visual terjaga di semua media, dari digital hingga cetak.",
        icon: "layers",
      },
      {
        title: "Fungsional",
        description:
          "Bukan hanya estetis — desain diarahkan untuk mendukung tujuan bisnis.",
        icon: "target",
      },
      {
        title: "File Lengkap",
        description:
          "Anda menerima berkas sumber dan format siap pakai (PNG, SVG, PDF).",
        icon: "folder",
      },
    ],
    steps: [
      {
        title: "Riset & Moodboard",
        description:
          "Memahami brand dan menyusun arah visual yang tepat.",
      },
      {
        title: "Eksplorasi Konsep",
        description:
          "Membuat beberapa alternatif desain untuk dipilih bersama.",
      },
      {
        title: "Penyempurnaan",
        description:
          "Menyempurnakan konsep terpilih hingga final sesuai masukan Anda.",
      },
      {
        title: "Pengiriman Aset",
        description:
          "Menyerahkan file lengkap beserta panduan penggunaannya.",
      },
    ],
    techStack: [
      "Figma",
      "Adobe Illustrator",
      "Design System",
      "Prototyping",
      "UI/UX Research",
    ],
    packages: [
      {
        name: "Logo Saja",
        suitedFor: "Usaha baru & personal",
        points: [
          "Desain logo utama",
          "Beberapa varian",
          "File siap pakai",
        ],
      },
      {
        name: "Identitas Brand",
        suitedFor: "Bisnis yang serius",
        points: [
          "Logo & varian lengkap",
          "Palet & tipografi",
          "Brand guideline",
        ],
      },
      {
        name: "Brand + UI/UX",
        suitedFor: "Produk digital",
        points: [
          "Identitas brand penuh",
          "Desain UI/UX web/app",
          "Prototype interaktif",
        ],
      },
    ],
    faqs: [
      {
        question: "Berapa banyak alternatif desain logo yang saya dapat?",
        answer:
          "Kami menyiapkan beberapa konsep awal, lalu menyempurnakan konsep terpilih hingga Anda puas.",
      },
      {
        question: "Apakah saya mendapat file sumbernya?",
        answer:
          "Ya. Anda menerima berkas sumber dan format ekspor (PNG, SVG, PDF) agar fleksibel dipakai di berbagai media.",
      },
      {
        question: "Berapa lama proses desain brand?",
        answer:
          "Logo saja umumnya 1–2 minggu, sedangkan identitas brand lengkap plus UI/UX bisa 3–6 minggu.",
      },
    ],
  },
  {
    slug: "digital-marketing",
    heroDescription:
      "Produk bagus perlu ditemukan orang. Kami membantu Anda membangun kehadiran digital yang konsisten — dari konten, media sosial, hingga strategi pemasaran yang terukur dan berkelanjutan.",
    highlights: [
      "Strategi konten yang terarah",
      "Pengelolaan media sosial",
      "Copywriting yang menjual",
      "Laporan performa berkala",
    ],
    deliverables: [
      {
        title: "Strategi Konten",
        description:
          "Rencana konten selaras dengan tujuan bisnis dan karakter audiens Anda.",
      },
      {
        title: "Pengelolaan Media Sosial",
        description:
          "Penjadwalan, publikasi, dan interaksi yang menjaga brand tetap aktif.",
      },
      {
        title: "Copywriting & Kreatif",
        description:
          "Teks dan materi visual yang menarik perhatian dan mendorong aksi.",
      },
      {
        title: "Optimasi & Laporan",
        description:
          "Pemantauan performa dan penyesuaian strategi berbasis data.",
      },
    ],
    features: [
      {
        title: "Terukur",
        description:
          "Setiap aktivitas dipantau dengan metrik yang jelas dan relevan.",
        icon: "chartBar",
      },
      {
        title: "Konsisten",
        description:
          "Publikasi dan pesan brand terjaga agar bisnis tetap dipercaya.",
        icon: "layers",
      },
      {
        title: "Relevan",
        description:
          "Konten disesuaikan dengan tren dan kebutuhan audiens Anda.",
        icon: "megaphone",
      },
      {
        title: "Berkelanjutan",
        description:
          "Strategi dirancang untuk pertumbuhan jangka panjang, bukan sekadar viral sesaat.",
        icon: "trending",
      },
    ],
    steps: [
      {
        title: "Audit & Riset",
        description:
          "Menilai kondisi kanal saat ini dan memahami target audiens.",
      },
      {
        title: "Penyusunan Strategi",
        description:
          "Merancang rencana konten dan pesan sesuai tujuan bisnis.",
      },
      {
        title: "Eksekusi Konten",
        description:
          "Memproduksi dan mempublikasikan konten secara terjadwal.",
      },
      {
        title: "Evaluasi & Optimasi",
        description:
          "Menganalisis performa lalu menyempurnakan strategi.",
      },
    ],
    techStack: [
      "Meta Business",
      "Instagram & TikTok",
      "Google Analytics",
      "Copywriting",
      "Content Calendar",
    ],
    packages: [
      {
        name: "Starter",
        suitedFor: "Bisnis yang baru mulai online",
        points: [
          "Strategi dasar",
          "Kalender konten",
          "Template kreatif",
        ],
      },
      {
        name: "Growth",
        suitedFor: "Bisnis yang ingin aktif",
        points: [
          "Pengelolaan media sosial",
          "Produksi konten",
          "Laporan bulanan",
        ],
      },
      {
        name: "Custom",
        suitedFor: "Kampanye menyeluruh",
        points: [
          "Strategi multi-kanal",
          "Kampanye terukur",
          "Optimasi berkelanjutan",
        ],
      },
    ],
    faqs: [
      {
        question: "Apakah harga sudah termasuk produksi konten?",
        answer:
          "Bergantung paket. Paket tertentu mencakup produksi konten; detailnya akan disesuaikan saat konsultasi.",
      },
      {
        question: "Platform apa saja yang bisa dikelola?",
        answer:
          "Umumnya Instagram, TikTok, Facebook, dan Google. Platform lain dapat disesuaikan dengan kebutuhan Anda.",
      },
      {
        question: "Kapan hasilnya mulai terlihat?",
        answer:
          "Pemasaran digital bersifat bertahap. Konsistensi umumnya mulai menunjukkan hasil dalam 1–3 bulan pertama.",
      },
    ],
  },
];

export function getServiceBySlug(slug: string) {
  const service = SERVICES.find((s) => s.slug === slug);
  const detail = SERVICES_DETAIL.find((d) => d.slug === slug);
  if (!service || !detail) return null;
  return { ...service, detail };
}

export function getServiceSlugs() {
  return SERVICES.map((s) => s.slug);
}

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
    testimonial: {
      quote:
        "Prosesnya cepat dan komunikatif. Website yang dibuat benar-benar membantu penjualan kami naik.",
      author: "Andi Pratama",
      role: "Owner, Kopi Lokal",
    },
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
    testimonial: {
      quote:
        "LKTech sangat memahami kebutuhan kami. Hasilnya rapi dan mudah dikelola oleh tim internal.",
      author: "Siti Rahmawati",
      role: "Direktur, EduMaju",
    },
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
    testimonial: {
      quote:
        "Harga masuk akal untuk kualitas sekelas agensi besar. Sistem toko online kami berjalan lancar.",
      author: "Bayu Nugraha",
      role: "Founder, Ritel Jaya",
    },
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

export const CLIENTS = [
  "Nusantara Co.",
  "Bina Karya",
  "Kopi Lokal",
  "EduMaju",
  "Ritel Jaya",
  "Medika Sehat",
];

/**
 * Teknologi yang kami gunakan — tampil sebagai marquee di beranda.
 *
 * Cara menambahkan logo asli (lihat `SETUP-LOGO-TEKNOLOGI.md`):
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

export const TESTIMONIALS = [
  {
    name: "Andi Pratama",
    role: "Owner, Kopi Lokal",
    quote:
      "Prosesnya cepat dan komunikatif. Website yang dibuat benar-benar membantu penjualan kami naik.",
    rating: 5,
  },
  {
    name: "Siti Rahmawati",
    role: "Direktur, EduMaju",
    quote:
      "LKTech sangat memahami kebutuhan kami. Hasilnya rapi dan mudah dikelola oleh tim internal.",
    rating: 5,
  },
  {
    name: "Bayu Nugraha",
    role: "Founder, Ritel Jaya",
    quote:
      "Harga masuk akal untuk kualitas sekelas agensi besar. Aplikasi mobile kami berjalan lancar.",
    rating: 5,
  },
];

export const PRICING = [
  {
    name: "Basic",
    description: "Cocok untuk UMKM dan personal yang baru memulai.",
    features: [
      "Website landing page / profil",
      "Desain responsif (mobile & desktop)",
      "Optimasi dasar SEO",
      "Revisi & dukungan awal",
    ],
    highlight: false,
  },
  {
    name: "Professional",
    description: "Pilihan terbaik untuk bisnis yang berkembang.",
    features: [
      "Website / web app lengkap",
      "Kustom desain & UI/UX",
      "Integrasi WhatsApp & form",
      "Optimasi performa & SEO",
      "Dukungan prioritas",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    description: "Solusi custom untuk kebutuhan kompleks.",
    features: [
      "Aplikasi mobile & web",
      "Arsitektur & integrasi custom",
      "Konsultasi teknologi menyeluruh",
      "Maintenance & pendampingan",
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

// Sosial media default (kosong). Diisi dari pengaturan dashboard.
export const SOCIALS: { label: string; href: string; icon: string }[] = [];
