import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { isOwnerEmail } from "@/lib/admins";
import { dryRunImport, exportBackup, importBackup } from "@/lib/backup";
import { validateBackupBundle, BACKUP_SOURCES, type BackupSource } from "@/lib/backup-pure";
import { recordAdminAudit } from "@/lib/admin-audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { ALL_CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import { invalidateSalesAnalyticsCache } from "@/lib/sales-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/backup?sources=settings,products,… — ekspor backup (JSON).
 * Tanpa `sources` → semua sumber. Dibatasi rate-limit (gap G18): ekspor
 * memicu I/O besar & dicatat di audit, jadi cegah penyalahgunaan/flood.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const rl = await checkRateLimit(`backup-export:${check.uid}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan ekspor. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("sources")?.trim();
  const sources: BackupSource[] = raw
    ? (raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => (BACKUP_SOURCES as readonly string[]).includes(s)) as BackupSource[])
    : [...BACKUP_SOURCES];

  try {
    const bundle = await exportBackup(sources, check.email);
    await recordAdminAudit({
      action: "settings.backup_export",
      actor: check.email,
      target: "backup",
      meta: { sources: sources.join(",") },
    });
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lktech-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/admin/backup] ekspor gagal:", err);
    return NextResponse.json({ error: "Gagal membuat backup." }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup — impor backup (body = bundle JSON). Validasi ketat + audit.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const rl = await checkRateLimit(`backup:${check.uid}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "File backup tidak valid (bukan JSON)." }, { status: 400 });
  }

  const validation = validateBackupBundle(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Restore `admins` adalah batas OWNER (ADM-01). Tolak sebelum dry-run agar
  // non-OWNER tidak bisa memakai endpoint ini untuk menambah/mengaktifkan admin.
  const owner = isOwnerEmail(check.email);
  const adminRows = validation.bundle.data.admins;
  if (!owner && Array.isArray(adminRows) && adminRows.length > 0) {
    return NextResponse.json(
      { error: "Hanya OWNER yang dapat memulihkan data admin." },
      { status: 403 },
    );
  }
  const policy = { allowAdmins: owner };

  // Dry-run (G4): hitung dampak tanpa menulis — untuk pratinjau admin.
  const url = new URL(req.url);
  if (url.searchParams.get("dryRun") === "1") {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      ...dryRunImport(validation.bundle, policy),
    });
  }

  try {
    const result = await importBackup(validation.bundle, policy);
    // Restore menulis ulang banyak koleksi → buang SEMUA cache data publik +
    // cache turunan pesanan, lalu segarkan halaman publik.
    for (const tag of ALL_CACHE_TAGS) revalidateTag(tag, REVALIDATE_NOW);
    invalidateSalesAnalyticsCache();
    revalidatePath("/", "layout");
    revalidatePath("/");
    await recordAdminAudit({
      action: "settings.restore",
      actor: check.email,
      target: "backup",
      meta: {
        written: result.written,
        failed: result.failed,
        skipped: result.skipped,
        truncated: result.truncated,
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/admin/backup] impor gagal:", err);
    return NextResponse.json({ error: "Gagal memulihkan backup." }, { status: 500 });
  }
}
