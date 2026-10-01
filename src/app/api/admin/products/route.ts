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
    featured: Boolean(body.featured),
    active: body.active === undefined ? true : Boolean(body.active),
    waMessage: body.waMessage?.trim() || undefined,
  };

  try {
    await saveProduct(product, check.email);
    revalidatePath("/produk");
    revalidatePath(`/produk/${product.slug}`);
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
