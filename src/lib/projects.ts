import { PROJECTS as DEFAULT_PROJECTS } from "@/lib/content";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Project, ProjectMetric, StoredProject } from "@/lib/project-types";
import { isAlreadyExistsError, SlugTakenError } from "@/lib/slug-reserve-pure";

export type { Project, StoredProject, ProjectMetric };

const COLLECTION = "projects";

/** Menormalkan data mentah dari Firestore menjadi `Project` yang valid. */
function normalizeProject(data: Record<string, unknown>): Project {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return {
    slug: str(data.slug),
    title: str(data.title),
    client: str(data.client),
    category: str(data.category, "Lainnya"),
    serviceSlug: str(data.serviceSlug),
    year: typeof data.year === "number" ? data.year : Number(data.year) || 0,
    summary: str(data.summary),
    pages: str(data.pages) || undefined,
    cover: str(data.cover, "default"),
    accent: str(data.accent, "from-[#004EDF] to-[#4D82EC]"),
    tags: strArr(data.tags),
    challenge: str(data.challenge),
    solution: str(data.solution),
    results: strArr(data.results),
    metrics: Array.isArray(data.metrics)
      ? (data.metrics as ProjectMetric[]).filter(
          (m) => m && typeof m.label === "string" && typeof m.value === "string",
        )
      : [],
    techStack: strArr(data.techStack),
    featured: data.featured === true,
    order:
      typeof data.order === "number" && Number.isFinite(data.order)
        ? data.order
        : undefined,
    updatedAt: typeof data.updatedAtISO === "string" ? data.updatedAtISO : undefined,
  };
}

/**
 * Urutan proyek: unggulan dulu, lalu `order` (kecil→besar; tanpa order di
 * akhir), lalu tahun terbaru, lalu judul A–Z.
 */
function sortProjects(a: Project, b: Project): number {
  if (Boolean(a.featured) !== Boolean(b.featured)) {
    return a.featured ? -1 : 1;
  }
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return b.year - a.year || a.title.localeCompare(b.title);
}

/**
 * Pembacaan MENTAH dari Firestore (tanpa cache) untuk proyek publik.
 * Fallback ke data default di content.ts HANYA bila Admin SDK belum
 * dikonfigurasi (mode demo). Saat SDK aktif namun koleksi dikosongkan sengaja,
 * kembalikan [].
 */
async function readProjects(): Promise<Project[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return DEFAULT_PROJECTS.map((p) => ({ ...p, demo: true }));

  try {
    const snap = await db.collection(COLLECTION).get();
    const projects = snap.docs.map((doc) => normalizeProject(doc.data()));
    return projects.sort(sortProjects);
  } catch (err) {
    console.error("[projects] gagal memuat:", err);
    return [];
  }
}

/**
 * Semua proyek publik (ber-CACHE). Dipakai beranda, `/portofolio`, sitemap,
 * `generateStaticParams` — `unstable_cache` mencegah pemindaian koleksi
 * berulang. Invalidasi via `revalidateTag(CACHE_TAGS.projects)` saat admin
 * menyimpan. Dashboard memakai `getStoredProjects()` (tanpa cache).
 */
export const getProjects = unstable_cache(readProjects, ["projects"], {
  tags: [CACHE_TAGS.projects],
  revalidate: 60,
});

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}

export async function getProjectSlugs(): Promise<string[]> {
  const projects = await getProjects();
  return projects.map((p) => p.slug);
}

export async function getProjectCategories(): Promise<string[]> {
  const projects = await getProjects();
  return ["Semua", ...Array.from(new Set(projects.map((p) => p.category)))];
}

/** Mengambil semua proyek untuk dashboard (termasuk id dokumen). */
export async function getStoredProjects(): Promise<StoredProject[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return DEFAULT_PROJECTS.map((p) => ({ ...p, id: p.slug }));

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...normalizeProject(doc.data()) }))
    .sort(sortProjects);
}

/**
 * Menyimpan (buat/perbarui) proyek berdasarkan slug.
 *
 * `opts.create` (ADM-28): saat **membuat proyek baru**, pakai `create()` atomik
 * yang menolak bila slug sudah dipakai (`SlugTakenError` → 409). Tanpa opsi ini
 * perilaku lama `set({ merge: true })` dipertahankan untuk pembaruan.
 */
export async function saveProject(
  project: Project,
  updatedBy: string,
  opts?: { create?: boolean },
): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const payload: Record<string, unknown> = {
    ...project,
    updatedAtISO: new Date().toISOString(),
    updatedBy,
  };

  const ref = db.collection(COLLECTION).doc(project.slug);
  if (opts?.create) {
    // Reservasi slug secara ATOMIK: gagal bila dokumen sudah ada (ADM-28).
    try {
      await ref.create(payload);
    } catch (err) {
      if (isAlreadyExistsError(err)) throw new SlugTakenError(project.slug);
      const snap = await ref.get().catch(() => null);
      if (snap?.exists) throw new SlugTakenError(project.slug);
      throw err;
    }
    return;
  }

  await ref.set(payload, { merge: true });
}

/** Menghapus proyek berdasarkan slug. */
export async function deleteProjectBySlug(slug: string): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  await db.collection(COLLECTION).doc(slug).delete();
}

/** Mengecek apakah slug sudah dipakai proyek lain. */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return false;

  const doc = await db.collection(COLLECTION).doc(slug).get();
  return doc.exists;
}
