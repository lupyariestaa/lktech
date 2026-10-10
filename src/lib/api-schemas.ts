import { z } from "zod";

/**
 * Skema validasi bersama untuk endpoint API (server-side).
 *
 * Tujuan: menolak input yang tidak sesuai bentuk/ukuran sebelum diproses
 * (mencegah data kotor, payload besar, dan mass-assignment). Dipakai oleh
 * route admin & user.
 */

/** URL gambar Cloudinary (atau "default"). */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "default" || /^https?:\/\//.test(v), {
    message: "URL gambar tidak valid.",
  });

// ===== Profil user =====
export const userProfileSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  photoURL: z.string().trim().max(1000).optional(),
});

// ===== Pengaturan situs =====
export const socialLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: z.string().trim().max(500).refine((v) => /^https?:\/\//.test(v), {
    message: "URL sosial harus diawali http(s)://",
  }),
  icon: z.string().trim().max(40),
});

export const settingsSchema = z.object({
  email: z.string().trim().max(200),
  whatsapp: z.string().trim().max(30),
  location: z.string().trim().max(200),
  socials: z.array(socialLinkSchema).max(12),
  notifyBuyerOnOrder: z.boolean().optional(),
  notifyBuyerOnStatus: z.boolean().optional(),
});

// ===== Media =====
/** Daftar kategori media yang valid (harus sinkron dengan media-types). */
export const mediaCategoryEnum = z.enum([
  "portofolio",
  "banner",
  "produk",
  "blog",
  "hero",
  "icon",
  "lainnya",
]);

/** Tag: array string pendek, dibatasi jumlahnya. */
export const mediaTagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20);

export const mediaCreateSchema = z.object({
  publicId: z.string().trim().min(1).max(500),
  secureUrl: z.string().trim().min(1).max(1000),
  width: z.number().finite().nonnegative().max(100000).optional(),
  height: z.number().finite().nonnegative().max(100000).optional(),
  format: z.string().trim().max(20).optional(),
  bytes: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  category: mediaCategoryEnum.optional(),
  title: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  tags: mediaTagsSchema.optional(),
  projectSlug: z.string().trim().max(200).optional(),
  productSlug: z.string().trim().max(200).optional(),
  articleSlug: z.string().trim().max(200).optional(),
});

/** Update metadata media (partial) via PATCH. */
export const mediaUpdateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  tags: mediaTagsSchema.optional(),
  category: mediaCategoryEnum.optional(),
  collectionId: z.string().trim().max(200).optional(),
  projectSlug: z.string().trim().max(200).optional(),
  productSlug: z.string().trim().max(200).optional(),
  articleSlug: z.string().trim().max(200).optional(),
  favorite: z.boolean().optional(),
  order: z.number().finite().optional(),
});

// ===== Koleksi media =====
export const mediaCollectionCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama koleksi wajib diisi").max(120),
  description: z.string().trim().max(300).optional(),
});

export const mediaCollectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional(),
  coverMediaId: z.string().trim().max(200).optional(),
});

// ===== Artikel =====
export const articleSchema = z.object({
  slug: z.string().trim().max(200).optional(),
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  excerpt: z.string().trim().max(500).optional(),
  body: z.string().max(50_000).optional(),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().max(60)).max(30).optional(),
  cover: imageUrlSchema.optional(),
  coverImage: z.string().trim().max(1000).optional(),
  coverAlt: z.string().trim().max(200).optional(),
  author: z.string().trim().max(80).optional(),
  status: z.enum(["draft", "published"]).optional(),
  publishedAt: z.string().trim().max(40).optional(),
  metaTitle: z.string().trim().max(120).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  scheduledAt: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), {
      message: "Jadwal terbit tidak valid.",
    })
    .optional(),
  /** Slug sebelum diubah (untuk riwayat redirect). */
  renamedFrom: z.string().trim().max(200).optional(),
  /** Slug artikel yang sedang diedit (kosong = artikel baru). Dipakai cek timpa (D10). */
  originalSlug: z.string().trim().max(200).optional(),
  /** Slug sumber bila artikel ini hasil duplikat (audit). */
  duplicatedFrom: z.string().trim().max(200).optional(),
});

// ===== Proyek =====
export const projectSchema = z.object({
  slug: z.string().trim().max(200).optional(),
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  client: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  serviceSlug: z.string().trim().max(200).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  summary: z.string().trim().max(2000).optional(),
  cover: imageUrlSchema.optional(),
  accent: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().max(60)).max(30).optional(),
  challenge: z.string().max(5000).optional(),
  solution: z.string().max(5000).optional(),
  results: z.array(z.string().trim().max(300)).max(30).optional(),
  metrics: z
    .array(
      z.object({
        label: z.string().trim().max(80),
        value: z.string().trim().max(80),
      }),
    )
    .max(20)
    .optional(),
  techStack: z.array(z.string().trim().max(60)).max(50).optional(),
});

// ===== Produk =====
export const productFeatureSchema = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(1000),
});

export const productSpecSchema = z.object({
  label: z.string().trim().max(80),
  value: z.string().trim().max(200),
});

export const productProcessStepSchema = z.object({
  step: z.string().trim().max(20),
  title: z.string().trim().max(200),
  description: z.string().trim().max(1000),
});

export const productVariantSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  tagline: z.string().trim().max(300).optional(),
  price: z.number().finite().min(0).max(1_000_000_000),
  originalPrice: z.number().finite().min(0).max(1_000_000_000).optional(),
  badge: z.string().trim().max(40).optional(),
  highlight: z.boolean().optional(),
  soldOut: z.boolean().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  features: z.array(productFeatureSchema).max(30).optional(),
  specs: z.array(productSpecSchema).max(40).optional(),
  includes: z.array(z.string().trim().max(200)).max(30).optional(),
  limits: z.array(z.string().trim().max(300)).max(30).optional(),
  delivery: z.string().trim().max(120).optional(),
  waMessage: z.string().trim().max(1000).optional(),
});

export const productSchema = z.object({
  slug: z.string().trim().max(200).optional(),
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(200),
  tagline: z.string().trim().max(300).optional(),
  description: z.string().max(10_000).optional(),
  category: z.string().trim().max(40).optional(),
  price: z.number().finite().min(0).max(1_000_000_000).optional(),
  originalPrice: z.number().finite().min(0).max(1_000_000_000).optional(),
  cover: imageUrlSchema.optional(),
  coverPublicId: z.string().trim().max(500).optional(),
  coverAlt: z.string().trim().max(200).optional(),
  gallery: z.array(z.string().trim().max(1000)).max(20).optional(),
  badge: z.string().trim().max(40).optional(),
  features: z.array(productFeatureSchema).max(20).optional(),
  specs: z.array(productSpecSchema).max(30).optional(),
  tools: z.array(z.string().trim().max(60)).max(30).optional(),
  includes: z.array(z.string().trim().max(200)).max(30).optional(),
  delivery: z.string().trim().max(120).optional(),
  process: z.array(productProcessStepSchema).max(20).optional(),
  notes: z.array(z.string().trim().max(300)).max(20).optional(),
  variants: z.array(productVariantSchema).max(12).optional(),
  downloadable: z
    .object({
      enabled: z.boolean().optional(),
      files: z
        .array(
          z.object({
            name: z.string().trim().max(200).optional(),
            url: z.string().trim().url("URL berkas tidak valid").max(2000),
            size: z.number().finite().min(0).optional(),
          }),
        )
        .max(30)
        .optional(),
      linkDays: z.number().int().min(0).max(3650).optional(),
      maxDownloads: z.number().int().min(0).max(10000).optional(),
      note: z.string().trim().max(1000).optional(),
    })
    .optional(),
  soldOut: z.boolean().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  relatedSlugs: z.array(z.string().trim().max(200)).max(12).optional(),
  reviewsEnabled: z.boolean().optional(),
  waMessage: z.string().trim().max(1000).optional(),
});

// ===== Akun user: wishlist & alamat =====

/** Slug produk untuk operasi wishlist. */
export const wishlistSlugSchema = z.object({
  slug: z.string().trim().min(1, "Slug produk wajib diisi").max(200),
});

/** Payload alamat pengiriman (untuk create/update). */
export const addressSchema = z.object({
  label: z.string().trim().min(1, "Label wajib diisi").max(40),
  recipient: z.string().trim().min(2, "Nama penerima minimal 2 karakter").max(80),
  phone: z
    .string()
    .trim()
    .min(8, "Nomor minimal 8 digit")
    .max(20, "Nomor terlalu panjang")
    .regex(/^[0-9+\-\s()]+$/, "Nomor telepon tidak valid"),
  address: z.string().trim().min(10, "Alamat minimal 10 karakter").max(500),
  city: z.string().trim().min(2, "Kota wajib diisi").max(120),
  postalCode: z.string().trim().max(12).optional(),
  note: z.string().trim().max(200).optional(),
  isPrimary: z.boolean().optional(),
});

/** Patch nama tampilan (edit profil). */
export const displayNameSchema = z.object({
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
});

/**
 * Normalisasi nomor telepon Indonesia ke digit (mis. "0812…"/"+62 812…" → "62812…").
 * Dipakai untuk menyimpan nomor WhatsApp secara konsisten.
 */
export function normalizeWhatsapp(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return digits;
}

/** Nomor WhatsApp user (validasi + normalisasi). */
export const whatsappSchema = z
  .string()
  .trim()
  .min(8, "Nomor WhatsApp minimal 8 digit")
  .max(24, "Nomor WhatsApp terlalu panjang")
  .transform((v) => normalizeWhatsapp(v))
  .refine((v) => /^62\d{8,15}$/.test(v), {
    message: "Nomor WhatsApp tidak valid (contoh: 08123456789).",
  });

/** Patch profil user (nama +/atau WhatsApp). */
export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80).optional(),
  whatsapp: whatsappSchema.optional(),
});

/** Toggle blokir user (admin). */
export const userBlockSchema = z.object({
  id: z.string().trim().min(1, "id wajib diisi").max(200),
  blocked: z.boolean(),
});

// ===== Draft keranjang server-side (FASE P5) =====

/** Satu item draft keranjang yang dikirim klien untuk sinkronisasi. */
export const cartDraftItemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  name: z.string().trim().max(300).optional(),
  price: z.number().finite().min(0).max(1_000_000_000),
  qty: z.number().int().min(1).max(999),
  variantSlug: z.string().trim().max(200).optional(),
});

/** Body sinkronisasi draft keranjang. */
export const cartDraftSchema = z.object({
  items: z.array(cartDraftItemSchema).max(100),
  subtotal: z.number().finite().min(0).max(1_000_000_000),
});

// ===== Ulasan & Rating produk (FASE R) =====

/** Kirim ulasan produk (verified purchase diperiksa server). */
export const reviewSubmitSchema = z.object({
  rating: z.number().int().min(1, "Beri rating 1–5").max(5, "Rating maksimal 5"),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
});

/** Moderasi ulasan (admin): approve/reject/hapus. */
export const reviewModerateSchema = z.object({
  id: z.string().trim().min(1, "id wajib diisi").max(200),
  status: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(300).optional(),
});

// ===== Newsletter & Broadcast (FASE R2) =====

/** Daftar newsletter (opt-in publik). */
export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(200),
  name: z.string().trim().max(80).optional(),
  source: z.string().trim().max(40).optional(),
  /** Honeypot anti-bot. */
  website: z.string().max(200).optional(),
});

/** Kirim broadcast (admin). */
export const broadcastSchema = z.object({
  subject: z.string().trim().min(3, "Subjek minimal 3 karakter").max(150),
  body: z.string().trim().min(3, "Isi minimal 3 karakter").max(8000),
  segment: z.enum(["semua", "beli", "belum"]).default("semua"),
  ctaLabel: z.string().trim().max(60).optional(),
  ctaUrl: z.string().trim().url("URL tombol tidak valid").max(500).optional(),
});

// ===== Kupon =====
/**
 * Tanggal ISO opsional — FAIL-CLOSED (`KP-H3`): string kosong → undefined;
 * string tak valid DITOLAK (bukan diabaikan), agar kupon tak "tanpa batas"
 * karena salah input. Menerima format ISO dari `new Date().toISOString()`.
 */
const couponDateField = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || !Number.isNaN(new Date(v).getTime()),
    { message: "Tanggal tidak valid." },
  );

const couponBaseFields = {
  code: z
    .string()
    .trim()
    .min(3, "Kode minimal 3 karakter")
    .max(40, "Kode terlalu panjang"),
  description: z.string().trim().max(200).optional(),
  type: z.enum(["percent", "amount"]),
  value: z.number().finite().min(0).max(1_000_000_000),
  minSpend: z.number().finite().min(0).max(1_000_000_000).default(0),
  /** Kupon bundel (FASE P3): slug produk yang wajib ada di keranjang. */
  appliesToSlugs: z.array(z.string().trim().max(200)).max(50).optional(),
  /** Kupon bundel (FASE P3): minimal jumlah item (qty) di keranjang. */
  minItems: z.number().int().min(0).max(100000).optional(),
  maxDiscount: z.number().finite().min(0).max(1_000_000_000).optional(),
  startsAt: couponDateField,
  endsAt: couponDateField,
  usageLimit: z.number().int().min(0).max(1_000_000).optional(),
  limitPerUser: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().default(true),
};

/** `startsAt` harus sebelum `endsAt` bila keduanya diisi (`KP-H3`). */
function refineDateRange<T extends { startsAt?: string; endsAt?: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine(
    (v) => {
      if (!v.startsAt || !v.endsAt) return true;
      return new Date(v.startsAt).getTime() < new Date(v.endsAt).getTime();
    },
    { message: "Tanggal mulai harus sebelum tanggal berakhir.", path: ["endsAt"] },
  );
}

export const couponCreateSchema = refineDateRange(
  z.object(couponBaseFields) as z.ZodType<{
    code: string;
    description?: string;
    type: "percent" | "amount";
    value: number;
    minSpend: number;
    appliesToSlugs?: string[];
    minItems?: number;
    maxDiscount?: number;
    startsAt?: string;
    endsAt?: string;
    usageLimit?: number;
    limitPerUser?: number;
    active: boolean;
  }>,
);

export const couponUpdateSchema = refineDateRange(
  z.object({
    code: couponBaseFields.code.optional(),
    description: couponBaseFields.description,
    type: couponBaseFields.type.optional(),
    value: couponBaseFields.value.optional(),
    minSpend: couponBaseFields.minSpend.optional(),
    appliesToSlugs: couponBaseFields.appliesToSlugs,
    minItems: couponBaseFields.minItems,
    maxDiscount: couponBaseFields.maxDiscount,
    startsAt: couponBaseFields.startsAt,
    endsAt: couponBaseFields.endsAt,
    usageLimit: couponBaseFields.usageLimit,
    limitPerUser: couponBaseFields.limitPerUser,
    active: z.boolean().optional(),
  }) as z.ZodType<{
    code?: string;
    description?: string;
    type?: "percent" | "amount";
    value?: number;
    minSpend?: number;
    appliesToSlugs?: string[];
    minItems?: number;
    maxDiscount?: number;
    startsAt?: string;
    endsAt?: string;
    usageLimit?: number;
    limitPerUser?: number;
    active?: boolean;
  }>,
);

