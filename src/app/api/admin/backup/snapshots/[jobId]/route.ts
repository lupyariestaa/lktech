import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-guard";
import {
  BackupRestoreError,
  getRestoreJob,
  runRestoreJobStep,
} from "@/lib/backup-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/backup/snapshots/[jobId] — status job.
 * POST /api/admin/backup/snapshots/[jobId] — jalankan satu langkah job.
 *
 * Job sudah dimulai dengan re-auth OWNER. Langkah berikutnya memakai OWNER
 * biasa + lock Firestore; ID job UUID tidak dapat ditebak.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const check = await requireOwner(req);
  if (!check.ok) return check.response;

  const { jobId } = await params;
  try {
    const job = await getRestoreJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job restore tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, job });
  } catch (err) {
    if (err instanceof BackupRestoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/admin/backup/snapshots/job] status gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat status restore." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const check = await requireOwner(req);
  if (!check.ok) return check.response;

  const { jobId } = await params;
  try {
    const result = await runRestoreJobStep(jobId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof BackupRestoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/admin/backup/snapshots/job] langkah gagal:", err);
    return NextResponse.json(
      { error: "Gagal menjalankan langkah restore." },
      { status: 500 },
    );
  }
}
