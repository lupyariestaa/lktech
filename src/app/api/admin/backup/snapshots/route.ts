import { NextResponse } from "next/server";
import { requireFreshOwner, requireOwner } from "@/lib/admin-guard";
import {
  BackupRestoreError,
  getActiveRestoreJob,
  listSnapshotSummaries,
  startSnapshotRestore,
} from "@/lib/backup-restore";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/backup/snapshots — daftar snapshot pre-restore (metadata).
 * POST /api/admin/backup/snapshots — mulai job restore bertahap.
 *
 * OWNER-only. Mulai restore memerlukan autentikasi kuat yang masih baru;
 * langkah job berikutnya cukup OWNER agar restore panjang tidak terputus
 * hanya karena jendela re-auth 10 menit habis.
 */

export async function GET(req: Request) {
  const check = await requireOwner(req);
  if (!check.ok) return check.response;

  try {
    const [snapshots, activeJob] = await Promise.all([
      listSnapshotSummaries(50),
      getActiveRestoreJob(),
    ]);
    return NextResponse.json({ ok: true, snapshots, activeJob });
  } catch (err) {
    console.error("[api/admin/backup/snapshots] daftar gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar snapshot." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const check = await requireFreshOwner(req);
  if (!check.ok) return check.response;

  const rl = await checkRateLimit(
    `backup-restore-start:${check.uid}`,
    3,
    10 * 60 * 1000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan restore. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const stamp =
    body && typeof body === "object" && typeof (body as { stamp?: unknown }).stamp === "string"
      ? (body as { stamp: string }).stamp.trim()
      : "";
  if (!stamp) {
    return NextResponse.json({ error: "stamp wajib diisi." }, { status: 400 });
  }

  try {
    const job = await startSnapshotRestore(stamp, check.email);
    return NextResponse.json({ ok: true, job });
  } catch (err) {
    if (err instanceof BackupRestoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/admin/backup/snapshots] mulai restore gagal:", err);
    return NextResponse.json(
      { error: "Gagal memulai restore snapshot." },
      { status: 500 },
    );
  }
}
