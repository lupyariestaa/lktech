/**
 * Data halaman Harga (`/harga`) yang bersifat HARDCODED.
 *
 * Paket umum (Basic/Profesional/Enterprise) tetap bersumber dari
 * `SiteContent.pricing` (dikelola dashboard). Di sini hanya bagian yang
 * statis & tidak perlu diedit admin:
 * - tabel banding fitur antar paket (`PRICING_COMPARE`)
 * - FAQ khusus harga (`PRICING_FAQS`)
 *
 * Karena tak dikelola dashboard, isinya bebas dibuat se-kaya mungkin.
 */

export type PricingCompareRow = {
  feature: string;
  /** Nilai per paket (boolean = centang/silang; string = teks). */
  values: (boolean | string)[];
};

/**
 * Urutan kolom tabel banding — mengikuti nama paket default
 * (`PRICING` di `content.ts`). Bila admin mengubah nama paket lewat dashboard,
 * kolom yang tidak cocok tidak akan mengganggu (lihat `PricingTable`).
 */
export const PRICING_COMPARE_COLUMNS = [
  "Basic",
  "Profesional",
  "Enterprise",
] as const;

/** Baris tabel banding paket (urutan nilai = urutan kolom di atas). */
export const PRICING_COMPARE: PricingCompareRow[] = [
  { feature: "Jumlah halaman / layar", values: ["1–5 halaman", "6–15 halaman", "Tanpa batas"] },
  { feature: "Desain custom & responsif", values: [true, true, true] },
  { feature: "Optimasi SEO", values: ["Dasar", "Lengkap", "Lengkap + riset kata kunci"] },
  { feature: "Integrasi WhatsApp & form", values: [true, true, true] },
  { feature: "Panel admin / CMS", values: [false, true, true] },
  { feature: "Optimasi performa lanjutan", values: [false, true, true] },
  { feature: "Aplikasi mobile", values: [false, false, true] },
  { feature: "Integrasi API / sistem pihak ketiga", values: [false, "Terbatas", true] },
  { feature: "Konsultasi & pendampingan", values: ["Awal", "Berkala", "Menyeluruh"] },
  { feature: "Maintenance & dukungan", values: ["Awal", "Opsional", "Berkala"] },
];

export type PricingFaq = { question: string; answer: string };

/** FAQ khusus seputar harga & paket (hardcoded). */
export const PRICING_FAQS: PricingFaq[] = [
  {
    question: "Apakah harga bisa dinegosiasi?",
    answer:
      "Cakupan setiap paket bisa disesuaikan dengan kebutuhan dan anggaran Anda. Sampaikan kebutuhan lewat konsultasi gratis, kami akan menyusun penawaran yang paling fair untuk Anda.",
  },
  {
    question: "Mengapa harga tidak dicantumkan sebagai angka?",
    answer:
      "Setiap proyek berbeda — jumlah halaman, fitur, dan integrasi memengaruhi biaya. Daripada memasang angka yang menyesatkan, kami beri estimasi transparan setelah memahami kebutuhan Anda, tanpa biaya konsultasi.",
  },
  {
    question: "Bagaimana skema pembayarannya?",
    answer:
      "Pembayaran dilakukan bertahap mengikuti progres pengerjaan (mis. termin awal, tengah, dan peluncuran). Skema detail disepakati bersama sebelum proyek dimulai — transparan, tanpa biaya tersembunyi.",
  },
  {
    question: "Apakah harga sudah termasuk domain dan hosting?",
    answer:
      "Biaya domain dan hosting dibayarkan langsung ke penyedia (tanpa markup), dan kami bantu seluruh proses pembelian serta konfigurasinya. Jadi Anda yang memegang kepemilikan penuh.",
  },
  {
    question: "Apakah ada biaya perawatan bulanan?",
    answer:
      "Maintenance bersifat opsional. Kami sediakan paket dukungan berkala bila Anda ingin perawatan, pembaruan konten, dan pemantauan keamanan. Bila tidak, website tetap milik Anda sepenuhnya.",
  },
  {
    question: "Bisakah memesan fitur di luar paket yang ada?",
    answer:
      "Tentu. Paket adalah titik awal, bukan batas. Fitur khusus bisa ditambahkan sesuai alur bisnis Anda — sampaikan saat konsultasi, kami beri rekomendasi terbaik.",
  },
  {
    question: "Apakah konsultasi benar-benar gratis?",
    answer:
      "Ya. Sesi konsultasi awal gratis tanpa komitmen untuk memahami kebutuhan Anda dan menyusun rekomendasi paket yang tepat.",
  },
];
