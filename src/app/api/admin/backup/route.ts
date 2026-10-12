import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { exportBackup, importBackup } from "@/lib/backup";
import { validateBackupBundle, BACKUP_SOURCES, type BackupSource } from "@/lib/backup-pure";
import { recordAdminAudit } from "@/lib/admin-audit";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/backup?sources=settings,products,… — ekspor backup (JSON).
 * Tanpa `sources` → semua sumber.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

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

  try {
    const result = await importBackup(validation.bundle);
    await recordAdminAudit({
      action: "settings.restore",
      actor: check.email,
      target: "backup",
      meta: { written: result.written, failed: result.failed },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/admin/backup] impor gagal:", err);
    return NextResponse.json({ error: "Gagal memulihkan backup." }, { status: 500 });
  }
}
