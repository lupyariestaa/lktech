export type ProjectMetric = {
  label: string;
  value: string;
};

export type ProjectTestimonial = {
  quote: string;
  author: string;
  role: string;
};

export type Project = {
  slug: string;
  title: string;
  client: string;
  category: string;
  serviceSlug: string;
  year: number;
  summary: string;
  /** Jumlah halaman/layar/modul (teks bebas, mis. "5 halaman", "12 layar"). */
  pages?: string;
  cover: string;
  accent: string;
  tags: string[];
  challenge: string;
  solution: string;
  results: string[];
  metrics: ProjectMetric[];
  techStack: string[];
  testimonial?: ProjectTestimonial;
  /** Tampilkan sebagai proyek unggulan (mis. di beranda). */
  featured?: boolean;
  /** Urutan tampil manual (kecil = lebih dulu). Bila kosong → pakai tahun. */
  order?: number;
  /**
   * True bila ini data contoh (fallback demo, belum ada di Firestore).
   * Dipakai untuk menampilkan penanda "Contoh" agar tidak disangka proyek nyata.
   */
  demo?: boolean;
  /** Waktu perubahan terakhir (ISO) — diisi server saat menyimpan. */
  updatedAt?: string;
};

/** Proyek tersimpan di Firestore (dengan id dokumen). */
export type StoredProject = Project & { id: string };
