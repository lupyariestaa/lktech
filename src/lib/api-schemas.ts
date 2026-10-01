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
});

// ===== Media =====
export const mediaCreateSchema = z.object({
  publicId: z.string().trim().min(1).max(500),
  secureUrl: z.string().trim().min(1).max(1000),
  width: z.number().finite().nonnegative().max(100000).optional(),
  height: z.number().finite().nonnegative().max(100000).optional(),
  format: z.string().trim().max(20).optional(),
  bytes: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  category: z.enum(["portofolio", "banner", "lainnya"]).optional(),
  title: z.string().trim().max(200).optional(),
  projectSlug: z.string().trim().max(200).optional(),
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
  author: z.string().trim().max(80).optional(),
  status: z.enum(["draft", "published"]).optional(),
  publishedAt: z.string().trim().max(40).optional(),
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
  testimonial: z
    .object({
      quote: z.string().trim().max(1000),
      author: z.string().trim().max(120),
      role: z.string().trim().max(120),
    })
    .optional(),
});

// ===== Produk =====
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
  gallery: z.array(z.string().trim().max(1000)).max(20).optional(),
  badge: z.string().trim().max(40).optional(),
  features: z
    .array(
      z.object({
        title: z.string().trim().max(120),
        description: z.string().trim().max(1000),
      }),
    )
    .max(20)
    .optional(),
  specs: z
    .array(
      z.object({
        label: z.string().trim().max(80),
        value: z.string().trim().max(200),
      }),
    )
    .max(30)
    .optional(),
  tools: z.array(z.string().trim().max(60)).max(30).optional(),
  includes: z.array(z.string().trim().max(200)).max(30).optional(),
  delivery: z.string().trim().max(120).optional(),
  soldOut: z.boolean().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  waMessage: z.string().trim().max(1000).optional(),
});
