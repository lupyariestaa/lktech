import { WA_MESSAGES } from "@/lib/whatsapp";

/**
 * Sumber kebenaran LAYANAN (hardcoded — TIDAK dikelola dashboard).
 *
 * Karena tidak lagi diedit via admin, konten di sini bebas dibuat sedetail &
 * sekaya mungkin. Dipakai oleh: /layanan, /layanan/[slug], sitemap.
 * (Beranda/footer/navbar masih membaca SiteContent.services untuk kompatibilitas.)
 */

export type ServiceKind = {
  title: string;
  description: string;
  icon: string;
};

export type ServiceUseCase = {
  title: string;
  description: string;
};

export type ServiceDeliverable = {
  title: string;
  description: string;
};

export type ServiceFeature = {
  title: string;
  description: string;
  icon: string;
};

export type ServiceStep = {
  title: string;
  description: string;
};

export type ServicePackage = {
  name: string;
  suitedFor: string;
  points: string[];
  /** Label khusus, mis. "Rekomendasi". */
  badge?: string;
  /** Tandai paket unggulan (disorot). */
  highlight?: boolean;
};

export type ServicePackageCompare = {
  feature: string;
  /** Nilai per paket (boolean = centang/silang; string = teks). */
  values: (boolean | string)[];
};

export type ServiceFaq = {
  question: string;
  answer: string;
};

export type ServiceDetail = {
  heroDescription: string;
  /** Poin "kenapa memilih layanan ini". */
  highlights: string[];
  /** "Apa saja yang bisa kami buat" — daftar jenis/kategori. */
  kinds?: ServiceKind[];
  /** "Cocok untuk" — target audiens/use case. */
  useCases?: ServiceUseCase[];
  deliverables: ServiceDeliverable[];
  features: ServiceFeature[];
  steps: ServiceStep[];
  techStack: string[];
  packages: ServicePackage[];
  /** Tabel banding paket (header memakai nama paket). */
  packageCompare?: ServicePackageCompare[];
  faqs: ServiceFaq[];
};

export type Service = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  accent: string;
  waMessage: string;
  /** Poin singkat untuk blok landing (3 item). */
  landingPoints: string[];
  detail: ServiceDetail;
};

export const SERVICES: Service[] = [
  // ============================================================
  // 1. PEMBUATAN WEBSITE
  // ============================================================
  {
    slug: "pembuatan-website",
    title: "Pembuatan Website",
    tagline: "Website cepat, responsif, dan siap konversi.",
    description:
      "Website profil perusahaan, landing page, toko online, hingga web aplikasi yang cepat, aman, dan ramah SEO.",
    icon: "globe",
    accent: "from-[#004EDF] to-[#4D82EC]",
    waMessage: WA_MESSAGES.website,
    landingPoints: [
      "Desain custom sesuai identitas brand Anda",
      "Mobile-first, cepat, & skor performa tinggi",
      "Ramah SEO & siap dikembangkan jangka panjang",
    ],
    detail: {
      heroDescription:
        "Kami membangun website yang bukan sekadar tampil cantik — tapi cepat, aman, ramah SEO, dan dirancang untuk mengubah pengunjung menjadi pelanggan. Apa pun kebutuhan Anda, dari profil sederhana hingga sistem web kompleks, kami kerjakan dengan standar profesional.",
      highlights: [
        "Desain custom sesuai identitas brand",
        "Mobile-first & responsif di semua ukuran layar",
        "Skor performa tinggi (Core Web Vitals)",
        "Aman, ramah SEO, & siap dikembangkan",
      ],
      kinds: [
        {
          title: "Landing Page",
          description:
            "Satu halaman fokus konversi — untuk promosi produk, jasa, event, atau tujuan iklan.",
          icon: "megaphone",
        },
        {
          title: "Company Profile",
          description:
            "Profil perusahaan resmi yang membangun kredibilitas: tentang, layanan, portofolio, kontak.",
          icon: "building",
        },
        {
          title: "Toko Online / E-commerce",
          description:
            "Katalog produk, keranjang, checkout, hingga pembayaran & pengiriman.",
          icon: "cart",
        },
        {
          title: "Website Portfolio",
          description:
            "Pameran karya profesional untuk freelancer, agensi, atau personal branding.",
          icon: "layoutGrid",
        },
        {
          title: "Website Sekolah & Instansi",
          description:
            "Profil lembaga, berita, agenda, PPDB, galeri, dan informasi publik.",
          icon: "graduation",
        },
        {
          title: "Web App & Dashboard",
          description:
            "Sistem berbasis web: panel admin, manajemen data, autentikasi, integrasi API.",
          icon: "layoutDashboard",
        },
        {
          title: "Blog & Media Online",
          description:
            "Portal artikel & berita dengan kategori, pencarian, dan kelola konten mandiri.",
          icon: "newspaper",
        },
        {
          title: "Website Company Event",
          description:
            "Halaman acara: jadwal, pembicara, pendaftaran, hingga tiket.",
          icon: "calendar",
        },
      ],
      useCases: [
        {
          title: "UMKM & Toko",
          description:
            "Punya toko online sendiri, lepas dari ketergantungan marketplace.",
        },
        {
          title: "Perusahaan & Startup",
          description:
            "Profil resmi yang kredibel untuk meyakinkan klien dan investor.",
        },
        {
          title: "Sekolah & Yayasan",
          description:
            "Kanal informasi resmi untuk siswa, orang tua, dan pendaftar.",
        },
        {
          title: "Personal & Freelancer",
          description:
            "Portofolio profesional yang membuat Anda dilirik lebih banyak klien.",
        },
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
        {
          title: "Kelola Mandiri",
          description:
            "Panel admin/CMS sederhana + panduan agar Anda bisa update konten sendiri.",
          icon: "settings",
        },
        {
          title: "Siap Tumbuh",
          description:
            "Arsitektur modular — mudah ditambah halaman atau fitur seiring bisnis berkembang.",
          icon: "trending",
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
          name: "Profesional",
          suitedFor: "Bisnis yang berkembang",
          badge: "Rekomendasi",
          highlight: true,
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
      packageCompare: [
        { feature: "Jumlah halaman", values: ["1–5 halaman", "6–15 halaman", "Tanpa batas"] },
        { feature: "Desain custom UI/UX", values: [false, true, true] },
        { feature: "Optimasi SEO", values: ["Dasar", "Lengkap", "Lengkap + riset"] },
        { feature: "Integrasi WhatsApp", values: [true, true, true] },
        { feature: "Panel admin / CMS", values: [false, true, true] },
        { feature: "E-commerce / pembayaran", values: [false, false, true] },
        { feature: "Integrasi API / sistem", values: [false, "Terbatas", true] },
        { feature: "Maintenance", values: [false, "Opsional", true] },
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
        {
          question: "Apakah website bisa dikembangkan nanti?",
          answer:
            "Tentu. Kami membangun dengan struktur modular sehingga mudah ditambah halaman, fitur, atau integrasi baru saat bisnis Anda tumbuh.",
        },
      ],
    },
  },

  // ============================================================
  // 2. APLIKASI MOBILE
  // ============================================================
  {
    slug: "aplikasi-mobile",
    title: "Aplikasi Mobile",
    tagline: "Aplikasi Android & iOS dengan pengalaman mulus.",
    description:
      "Aplikasi Android & iOS untuk bisnis dan layanan publik dengan pengalaman pengguna yang mulus.",
    icon: "smartphone",
    accent: "from-[#4D82EC] to-[#0A0F1E]",
    waMessage: WA_MESSAGES.mobile,
    landingPoints: [
      "Satu basis kode untuk Android & iOS",
      "UI/UX intuitif, ringan, & hemat baterai",
      "Notifikasi, realtime, & siap integrasi",
    ],
    detail: {
      heroDescription:
        "Kami merancang dan membangun aplikasi Android & iOS yang cepat, stabil, dan disukai pengguna — dari aplikasi bisnis, layanan publik, hingga produk digital. Fokus pada pengalaman pengguna dan kemudahan pengembangan jangka panjang.",
      highlights: [
        "Satu basis kode untuk Android & iOS",
        "UI/UX yang intuitif dan konsisten",
        "Performa ringan & hemat baterai",
        "Siap diintegrasikan dengan sistem Anda",
      ],
      kinds: [
        {
          title: "Aplikasi Kasir / POS",
          description:
            "Transaksi, stok, dan laporan penjualan untuk toko & UMKM dalam satu genggaman.",
          icon: "cart",
        },
        {
          title: "Aplikasi Katalog & Order",
          description:
            "Katalog produk, keranjang, dan pemesanan langsung dari aplikasi.",
          icon: "layoutGrid",
        },
        {
          title: "Aplikasi Booking / Reservasi",
          description:
            "Jadwal, pemesanan, dan pengingat untuk klinik, salon, bengkel, atau layanan jasa.",
          icon: "calendar",
        },
        {
          title: "Aplikasi Membership / Loyalitas",
          description:
            "Keanggotaan, poin, voucher, dan program loyalitas pelanggan.",
          icon: "heart",
        },
        {
          title: "Aplikasi Edukasi",
          description:
            "Materi belajar, kuis, dan akses khusus siswa atau peserta.",
          icon: "graduation",
        },
        {
          title: "Aplikasi Absensi & Internal",
          description:
            "Absensi, pencatatan, laporan, dan alur kerja tim.",
          icon: "layoutDashboard",
        },
        {
          title: "Aplikasi Layanan Publik",
          description:
            "Informasi dan interaksi untuk warga, anggota, atau komunitas.",
          icon: "building",
        },
        {
          title: "MVP Produk Digital",
          description:
            "Versi awal produk untuk validasi ide dengan cepat dan hemat biaya.",
          icon: "sparkles",
        },
      ],
      useCases: [
        {
          title: "Toko & UMKM",
          description:
            "Kelola penjualan & stok langsung dari ponsel, di mana pun Anda berada.",
        },
        {
          title: "Layanan Jasa",
          description:
            "Klinik, salon, bengkel, dan sejenis — atur jadwal & pelanggan dengan rapi.",
        },
        {
          title: "Sekolah & Komunitas",
          description:
            "Aplikasi internal untuk anggota, siswa, atau karyawan.",
        },
        {
          title: "Startup & Produk Digital",
          description:
            "Bangun MVP untuk memvalidasi ide sebelum investasi besar.",
        },
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
          badge: "Rekomendasi",
          highlight: true,
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
      packageCompare: [
        { feature: "Platform", values: ["1 platform", "Android + iOS", "Android + iOS"] },
        { feature: "Jumlah layar", values: ["≤5 layar", "6–15 layar", "Tanpa batas"] },
        { feature: "Akun pengguna", values: [false, true, true] },
        { feature: "Push notifikasi", values: ["Dasar", "Lengkap", "Lengkap"] },
        { feature: "Panel admin", values: [false, true, true] },
        { feature: "Pembayaran / API pihak ketiga", values: [false, "Terbatas", true] },
        { feature: "Analitik", values: [false, "Dasar", "Lengkap"] },
        { feature: "Maintenance", values: [false, "Opsional", true] },
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
        {
          question: "Apakah Android dan iOS dibuat terpisah?",
          answer:
            "Tidak. Kami memakai satu basis kode (React Native) sehingga lebih hemat biaya dan cepat, tanpa mengorbankan kualitas di kedua platform.",
        },
      ],
    },
  },

  // ============================================================
  // 3. KONSULTASI TEKNOLOGI
  // ============================================================
  {
    slug: "konsultasi-teknologi",
    title: "Konsultasi Teknologi",
    tagline: "Arah teknologi yang tepat untuk bisnis Anda.",
    description:
      "Pendampingan arsitektur, pemilihan teknologi, dan strategi transformasi digital untuk bisnis Anda.",
    icon: "compass",
    accent: "from-[#004EDF] to-[#003BB3]",
    waMessage: WA_MESSAGES.consultant,
    landingPoints: [
      "Analisis kebutuhan & sistem saat ini",
      "Rekomendasi arsitektur & teknologi",
      "Roadmap digital yang realistis",
    ],
    detail: {
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
          description: "Kami pelajari sistem dan kebutuhan lalu menyusun temuan.",
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
          points: ["1–2 sesi diskusi", "Ringkasan rekomendasi", "Tanya jawab"],
        },
        {
          name: "Audit & Roadmap",
          suitedFor: "Perencanaan serius",
          badge: "Rekomendasi",
          highlight: true,
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
  },

  // ============================================================
  // 4. DESAIN & BRANDING
  // ============================================================
  {
    slug: "desain-branding",
    title: "Desain & Branding",
    tagline: "Identitas visual yang profesional dan berkesan.",
    description:
      "Pembuatan logo, identitas brand, dan desain UI/UX yang membuat bisnis Anda tampil profesional.",
    icon: "palette",
    accent: "from-[#4D82EC] to-[#004EDF]",
    waMessage: WA_MESSAGES.general,
    landingPoints: [
      "Logo & identitas brand yang khas",
      "Panduan penggunaan brand (guideline)",
      "Desain UI/UX untuk web & aplikasi",
    ],
    detail: {
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
          description: "Memahami brand dan menyusun arah visual yang tepat.",
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
          points: ["Desain logo utama", "Beberapa varian", "File siap pakai"],
        },
        {
          name: "Identitas Brand",
          suitedFor: "Bisnis yang serius",
          badge: "Rekomendasi",
          highlight: true,
          points: ["Logo & varian lengkap", "Palet & tipografi", "Brand guideline"],
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
  },

  // ============================================================
  // 5. DIGITAL MARKETING
  // ============================================================
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    tagline: "Jangkau lebih banyak pelanggan potensial.",
    description:
      "Pengelolaan konten dan pemasaran digital untuk menjangkau lebih banyak pelanggan potensial.",
    icon: "megaphone",
    accent: "from-[#003BB3] to-[#4D82EC]",
    waMessage: WA_MESSAGES.general,
    landingPoints: [
      "Strategi konten yang terarah",
      "Pengelolaan media sosial",
      "Laporan performa berkala",
    ],
    detail: {
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
          points: ["Strategi dasar", "Kalender konten", "Template kreatif"],
        },
        {
          name: "Growth",
          suitedFor: "Bisnis yang ingin aktif",
          badge: "Rekomendasi",
          highlight: true,
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
  },
];

/** Peta slug → layanan. */
export const SERVICES_MAP: Record<string, Service> = Object.fromEntries(
  SERVICES.map((s) => [s.slug, s]),
);

/** Ambil satu layanan berdasarkan slug. */
export function getService(slug: string): Service | undefined {
  return SERVICES_MAP[slug];
}

/** Daftar slug layanan (untuk sitemap & static params). */
export function getServiceSlugs(): string[] {
  return SERVICES.map((s) => s.slug);
}
