import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteProjectBySlug,
  getStoredProjects,
  isSlugTaken,
  saveProject,
} from "@/lib/projects";
import type { Project } from "@/lib/project-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** GET /api/admin/projects — daftar proyek (dengan id). */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const projects = await getStoredProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api/admin/projects] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat proyek." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/projects — buat/perbarui proyek.
 * Body: Project
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: Partial<Project>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
  }

  const slug = (body.slug?.trim() || slugify(title)).trim();
  if (!slug) {
    return NextResponse.json({ error: "Slug tidak valid." }, { status: 400 });
  }

  const project: Project = {
    slug,
    title,
    client: (body.client ?? "").trim(),
    category: (body.category ?? "Lainnya").trim(),
    serviceSlug: (body.serviceSlug ?? "").trim(),
    year: Number(body.year) || new Date().getFullYear(),
    summary: (body.summary ?? "").trim(),
    cover: (body.cover ?? "default").trim(),
    accent: (body.accent ?? "from-[#004EDF] to-[#4D82EC]").trim(),
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    challenge: (body.challenge ?? "").trim(),
    solution: (body.solution ?? "").trim(),
    results: Array.isArray(body.results) ? body.results.filter(Boolean) : [],
    metrics: Array.isArray(body.metrics)
      ? body.metrics.filter((m) => m && m.label && m.value)
      : [],
    techStack: Array.isArray(body.techStack)
      ? body.techStack.filter(Boolean)
      : [],
    testimonial: body.testimonial?.quote?.trim()
      ? {
          quote: body.testimonial.quote.trim(),
          author: (body.testimonial.author ?? "").trim(),
          role: (body.testimonial.role ?? "").trim(),
        }
      : undefined,
  };

  try {
    await saveProject(project, check.email);
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    console.error("[api/admin/projects] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan proyek." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/projects?slug=xxx */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });
  }

  try {
    await deleteProjectBySlug(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/projects] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus proyek." },
      { status: 500 },
    );
  }
}

/** HEAD /api/admin/projects?slug=xxx — cek ketersediaan slug. */
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
    const taken = await isSlugTaken(slug);
    return NextResponse.json({ taken });
  } catch (err) {
    console.error("[api/admin/projects] PUT gagal:", err);
    return NextResponse.json({ error: "Gagal memeriksa slug." }, { status: 500 });
  }
}
