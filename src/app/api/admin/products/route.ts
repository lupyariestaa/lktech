import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteProductBySlug,
  getStoredProducts,
  isProductSlugTaken,
  saveProduct,
} from "@/lib/products";
import {
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
} from "@/lib/product-types";
import { productSchema } from "@/lib/api-schemas";
import { sanitizeSlug } from "@/lib/utils";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCategory(v: unknown): ProductCategory {
  const c = typeof v === "string" ? v : "";
  return (PRODUCT_CATEGORIES as readonly string[]).includes(c)
    ? (c as ProductCategory)
    : "lainnya";
}

/** GET /api/admin/products — daftar produk (termasuk non-aktif). */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const products = await getStoredProducts();
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[api/admin/products] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat produk." }, { status: 500 });
  }
}

/** POST /api/admin/products — buat/perbarui produk. Body: Product */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = productSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data produk tidak valid." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const name = body.name.trim();
  const slug = sanitizeSlug(body.slug?.trim() || name);
  if (!slug) {
    return NextResponse.json({ error: "Slug tidak valid." }, { status: 400 });
  }

  const product: Product = {
    slug,
    name,
    tagline: (body.tagline ?? "").trim(),
    description: (body.description ?? "").trim(),
    category: toCategory(body.category),
    price: Number(body.price) || 0,
    originalPrice:
      body.originalPrice && Number(body.originalPrice) > 0
        ? Number(body.originalPrice)
        : undefined,
    cover: (body.cover ?? "default").trim() || "default",
    coverPublicId: body.coverPublicId?.trim() || undefined,
    gallery: Array.isArray(body.gallery) ? body.gallery.filter(Boolean) : [],
    badge: body.badge?.trim() || undefined,
    features: Array.isArray(body.features)
      ? body.features.filter((f) => f && f.title?.trim())
      : [],
    specs: Array.isArray(body.specs)
      ? body.specs.filter((s) => s && s.label?.trim())
      : [],
    tools: Array.isArray(body.tools) ? body.tools.filter(Boolean) : [],
    includes: Array.isArray(body.includes) ? body.includes.filter(Boolean) : [],
    delivery: body.delivery?.trim() || undefined,
    soldOut: Boolean(body.soldOut),
    stock: typeof body.stock === "number" && body.stock >= 0 ? Math.floor(body.stock) : undefined,
    featured: Boolean(body.featured),
    active: body.active === undefined ? true : Boolean(body.active),
    waMessage: body.waMessage?.trim() || undefined,
    process: Array.isArray(body.process)
      ? body.process
          .filter((s) => s && (s.title || s.description))
          .map((s) => ({
            step: (s.step ?? "").toString().trim(),
            title: (s.title ?? "").trim(),
            description: (s.description ?? "").trim(),
          }))
      : [],
    notes: Array.isArray(body.notes) ? body.notes.filter(Boolean) : [],
    relatedSlugs: Array.isArray(body.relatedSlugs)
      ? Array.from(
          new Set(
            body.relatedSlugs
              .map((s) => sanitizeSlug(String(s)))
              .filter((s) => s && s !== slug),
          ),
        ).slice(0, 12)
      : undefined,
    variants: Array.isArray(body.variants)
      ? body.variants
          .filter((v) => v && v.slug?.trim() && v.name?.trim())
          .map((v) => ({
            slug: sanitizeSlug(v.slug),
            name: v.name.trim(),
            tagline: v.tagline?.trim() || undefined,
            price: Number(v.price) || 0,
            originalPrice:
              v.originalPrice && Number(v.originalPrice) > 0
                ? Number(v.originalPrice)
                : undefined,
            badge: v.badge?.trim() || undefined,
            highlight: Boolean(v.highlight),
            soldOut: Boolean(v.soldOut),
            stock: typeof v.stock === "number" && v.stock >= 0 ? Math.floor(v.stock) : undefined,
            features: Array.isArray(v.features)
              ? v.features.filter((f) => f && f.title?.trim())
              : [],
            specs: Array.isArray(v.specs)
              ? v.specs.filter((s) => s && s.label?.trim())
              : [],
            includes: Array.isArray(v.includes) ? v.includes.filter(Boolean) : [],
            limits: Array.isArray(v.limits) ? v.limits.filter(Boolean) : [],
            delivery: v.delivery?.trim() || undefined,
            waMessage: v.waMessage?.trim() || undefined,
          }))
      : [],
    downloadable: (() => {
      const d = body.downloadable;
      if (!d) return undefined;
      const files = Array.isArray(d.files)
        ? d.files
            .filter((f) => f && f.url?.trim())
            .map((f) => ({
              name: f.name?.trim() || "Berkas",
              url: f.url.trim(),
              size: typeof f.size === "number" ? f.size : undefined,
            }))
        : [];
      if (files.length === 0) return undefined;
      return {
        enabled: d.enabled === undefined ? true : Boolean(d.enabled),
        files,
        linkDays: d.linkDays && d.linkDays > 0 ? d.linkDays : undefined,
        maxDownloads:
          d.maxDownloads && d.maxDownloads > 0 ? d.maxDownloads : undefined,
        note: d.note?.trim() || undefined,
      };
    })(),
  };

  try {
    await saveProduct(product, check.email);
    revalidatePath("/produk");
    revalidatePath(`/produk/${product.slug}`);
    await recordAdminAudit({
      action: "product.save",
      actor: check.email,
      target: product.slug,
      meta: { name: product.name },
    });
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    console.error("[api/admin/products] POST gagal:", err);
    return NextResponse.json({ error: "Gagal menyimpan produk." }, { status: 500 });
  }
}

/** DELETE /api/admin/products?slug=xxx */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });
  }

  try {
    await deleteProductBySlug(slug);
    revalidatePath("/produk");
    await recordAdminAudit({
      action: "product.delete",
      actor: check.email,
      target: slug,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/products] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus produk." }, { status: 500 });
  }
}

/** PUT /api/admin/products?slug=xxx — cek ketersediaan slug. */
export async function PUT(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });
  }

  try {
    const taken = await isProductSlugTaken(slug);
    return NextResponse.json({ taken });
  } catch (err) {
    console.error("[api/admin/products] PUT gagal:", err);
    return NextResponse.json({ error: "Gagal memeriksa slug." }, { status: 500 });
  }
}
