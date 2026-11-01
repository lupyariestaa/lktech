import { NextResponse } from "next/server";
import { FieldPath, type Firestore, type Query, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { LEAD_STATUSES, type LeadStatus, type StoredLead, type LeadActivity } from "@/lib/lead-types";
import {
  hasLeadFilter,
  matchesLeadQuery,
  paginateLeads,
  LEAD_EXPORT_CAP,
  LEAD_SCAN_BATCH,
  LEAD_SCAN_CAP,
} from "@/lib/lead-list-pure";
import { isOwnerEmail } from "@/lib/admins";
import { isPipelineStage, statusToStage } from "@/lib/lead-scoring-pure";
import { updateLeadStage, addLeadActivity } from "@/lib/lead-crm";
import { recordAdminAudit } from "@/lib/admin-audit";
import { guardAdminMutation } from "@/lib/admin-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ubah dokumen Firestore menjadi `StoredLead` (default aman untuk lead lama). */
function toStoredLead(doc: QueryDocumentSnapshot): StoredLead {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    service: d.service ?? "",
    message: d.message ?? "",
    status: (d.status as LeadStatus) ?? "baru",
    createdAt: d.createdAtISO ?? null,
    source: d.source,
    userAgent: d.userAgent,
    // CRM mini (Tema 3.2) — default aman utk lead lama.
    score: typeof d.score === "number" ? d.score : undefined,
    stage:
      typeof d.stage === "string"
        ? d.stage
        : statusToStage(String(d.status ?? "baru")),
    activities: Array.isArray(d.activities)
      ? (d.activities as LeadActivity[])
      : undefined,
    lastActivityAtISO:
      typeof d.lastActivityAtISO === "string" ? d.lastActivityAtISO : undefined,
  };
}

/**
 * Pindai dokumen lead (terurut baru→lama) BERTAHAP per `LEAD_SCAN_BATCH` sampai
 * habis atau batas keras `LEAD_SCAN_CAP` (Sprint 12 / ADM-16).
 *
 * Dipakai saat ada pencarian/filter: Firestore tak punya `contains`, jadi
 * pencarian substring harus memindai jendela terbatas lalu difilter di memori.
 * `exhausted = false` menandakan hasil mungkin terpotong (pemanggil menandai
 * `truncated`). `startAfter(snapshot)` menjaga iterasi stabil.
 */
async function scanLeads(
  db: Firestore,
): Promise<{ leads: StoredLead[]; exhausted: boolean }> {
  const leads: StoredLead[] = [];
  let last: QueryDocumentSnapshot | null = null;
  while (leads.length < LEAD_SCAN_CAP) {
    const batchLimit = Math.min(LEAD_SCAN_BATCH, LEAD_SCAN_CAP - leads.length);
    let q: Query = db
      .collection("leads")
      .orderBy("createdAtISO", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (last) q = q.startAfter(last);
    const snap = await q.limit(batchLimit).get();
    if (snap.docs.length === 0) return { leads, exhausted: true };
    for (const doc of snap.docs) leads.push(toStoredLead(doc));
    last = snap.docs[snap.docs.length - 1];
    // Batch tidak penuh → tidak ada dokumen lagi setelah ini.
    if (snap.docs.length < batchLimit) return { leads, exhausted: true };
  }
  return { leads, exhausted: false };
}

/**
 * GET /api/admin/leads — halaman lead terbaru.
 *   Query: ?q=<cari nama/email/layanan/pesan> ?status=<baru|diproses|selesai|arsip> ?limit=<1..100> ?cursor=<id>
 * GET /api/admin/leads?summary=1 — ringkasan jumlah per status (untuk badge).
 * GET /api/admin/leads?export=1 — ekspor seluruh hasil filter (OWNER-only, cap 5.000).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Admin SDK tidak tersedia." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);

  // Ekspor massal PII lead khusus OWNER (ADM-03/ADM-16).
  if (url.searchParams.get("export") === "1") {
    if (!isOwnerEmail(check.email)) {
      return NextResponse.json(
        { error: "Ekspor data lead massal hanya dapat dilakukan OWNER." },
        { status: 403 },
      );
    }
    const q = url.searchParams.get("q") ?? undefined;
    const statusRaw = url.searchParams.get("status");
    const status =
      statusRaw && LEAD_STATUSES.includes(statusRaw as LeadStatus)
        ? statusRaw
        : "semua";
    try {
      const { leads, exhausted } = await scanLeads(db);
      const filtered = leads.filter((lead) => matchesLeadQuery(lead, { q, status }));
      return NextResponse.json(
        { leads: filtered, truncated: !exhausted, cap: LEAD_EXPORT_CAP },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/leads] export gagal:", err);
      return NextResponse.json(
        { error: "Gagal mengekspor data lead." },
        { status: 500 },
      );
    }
  }

  // Ringkasan count per status untuk badge sidebar (response kecil).
  const wantsSummary = url.searchParams.get("summary") === "1";
  if (wantsSummary) {
    try {
      const [total, ...byStatus] = await Promise.all([
        db.collection("leads").count().get(),
        ...LEAD_STATUSES.map((status) =>
          db.collection("leads").where("status", "==", status).count().get(),
        ),
      ]);
      const counts = { total: total.data().count } as Record<string, number>;
      LEAD_STATUSES.forEach((status, i) => {
        counts[status] = byStatus[i].data().count;
      });
      // Summary lama tetap kompatibel: trend diambil oleh route dashboard
      // terpisah agar endpoint badge tidak perlu 14 count tambahan.
      if (url.searchParams.get("trend") !== "1") {
        return NextResponse.json(
          { summary: counts },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const today = new Date();
      const trendTimeZone = "Asia/Jakarta";
      const todayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: trendTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(today);
      const [year, month, dayOfMonth] = todayKey.split("-").map(Number);
      const days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(Date.UTC(
          year,
          month - 1,
          dayOfMonth - (13 - i),
        ));
        const key = date.toISOString().slice(0, 10);
        const start = new Date(`${key}T00:00:00+07:00`).toISOString();
        const end = new Date(`${new Date(date.getTime() + 86_400_000)
          .toISOString().slice(0, 10)}T00:00:00+07:00`).toISOString();
        return { key, start, end };
      });
      const trendCounts = await Promise.all(
        days.map(({ start, end }) =>
          db.collection("leads")
            .where("createdAtISO", ">=", start)
            .where("createdAtISO", "<", end)
            .count()
            .get(),
        ),
      );
      return NextResponse.json(
        {
          summary: counts,
          trend: days.map((day, i) => ({
            date: day.key,
            count: trendCounts[i].data().count,
          })),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/leads] summary gagal:", err);
      return NextResponse.json(
        { error: "Gagal menghitung lead." },
        { status: 500 },
      );
    }
  }

  try {
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 100)
      : 50;
    const cursor = url.searchParams.get("cursor");
    if (cursor && (cursor.length > 1500 || cursor.includes("/"))) {
      return NextResponse.json({ error: "Cursor tidak valid." }, { status: 400 });
    }

    const q = url.searchParams.get("q") ?? undefined;
    const statusRaw = url.searchParams.get("status");
    const status =
      statusRaw && LEAD_STATUSES.includes(statusRaw as LeadStatus)
        ? statusRaw
        : "semua";

    // Ada pencarian/filter → pindai jendela terbatas lalu filter di memori
    // (Firestore tak punya `contains`), dengan penanda batas yang jujur.
    if (hasLeadFilter({ q, status })) {
      const { leads: scanned, exhausted } = await scanLeads(db);
      const matched = scanned.filter((lead) =>
        matchesLeadQuery(lead, { q, status }),
      );
      const page = paginateLeads({
        filtered: matched,
        cursorId: cursor,
        limit,
        scanExhausted: exhausted,
      });
      return NextResponse.json(
        {
          leads: page.items,
          nextCursor: page.nextCursor,
          truncated: page.truncated,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const query = db
      .collection("leads")
      .orderBy("createdAtISO", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    const cursorDoc = cursor ? await db.collection("leads").doc(cursor).get() : null;
    if (cursor && !cursorDoc?.exists) {
      return NextResponse.json({ error: "Cursor tidak valid." }, { status: 400 });
    }
    const pagedQuery = cursorDoc?.exists
      ? query.startAfter(cursorDoc).limit(limit + 1)
      : query.limit(limit + 1);
    const snap = await pagedQuery.get();
    const pageDocs = snap.docs.slice(0, limit);
    const leads = pageDocs.map((doc) => toStoredLead(doc));

    return NextResponse.json({
      leads,
      nextCursor:
        snap.docs.length > limit && pageDocs.length > 0
          ? pageDocs[pageDocs.length - 1].id
          : null,
      truncated: false,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/admin/leads] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data lead." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/leads — ubah lead (status, stage pipeline, &/atau tambah aktivitas).
 * Body:
 *   - { id, status: LeadStatus }              — ubah status lama (badge/filter).
 *   - { id, stage: PipelineStage }            — ubah tahap pipeline (+ sinkron status).
 *   - { id, activity: { type, note } }        — tambah entri timeline.
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Admin SDK tidak tersedia." },
      { status: 503 },
    );
  }

  let body: {
    id?: string;
    status?: string;
    stage?: string;
    activity?: { type?: string; note?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  // ===== Ubah STAGE pipeline (sinkron status + aktivitas + skor) =====
  if (body.stage !== undefined) {
    if (!isPipelineStage(body.stage)) {
      return NextResponse.json({ error: "Tahap tidak valid." }, { status: 400 });
    }
    const stage = await updateLeadStage(id, body.stage, check.email);
    if (!stage) {
      return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
    }
    await recordAdminAudit({
      action: "lead.status",
      actor: check.email,
      target: id,
      meta: { stage: body.stage, via: "stage" },
    });
    return NextResponse.json({ ok: true, stage });
  }

  // ===== Tambah AKTIVITAS timeline =====
  if (body.activity !== undefined) {
    const note = (body.activity.note ?? "").trim();
    if (!note) {
      return NextResponse.json({ error: "Catatan tidak boleh kosong." }, { status: 400 });
    }
    const allowed = ["catatan", "panggilan", "email", "wa"];
    const type = allowed.includes(String(body.activity.type))
      ? (body.activity.type as LeadActivity["type"])
      : "catatan";
    const ok = await addLeadActivity(id, { type, note, actor: check.email });
    if (!ok) {
      return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
    }
    await recordAdminAudit({
      action: "lead.activity",
      actor: check.email,
      target: id,
      meta: { type },
    });
    return NextResponse.json({ ok: true });
  }

  // ===== Ubah STATUS lama (juga sinkronkan `stage` pipeline) =====
  const { status } = body;
  if (!status) {
    return NextResponse.json(
      { error: "status, stage, atau activity wajib diisi." },
      { status: 400 },
    );
  }
  if (!LEAD_STATUSES.includes(status as LeadStatus)) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  try {
    await db.collection("leads").doc(id).update({
      status,
      // Sinkronkan tahap pipeline dari status lama agar konsisten (Tema 3.2).
      stage: statusToStage(status),
      updatedAtISO: new Date().toISOString(),
      updatedBy: check.email,
    });
    await recordAdminAudit({
      action: "lead.status",
      actor: check.email,
      target: id,
      meta: { status, via: "status" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/leads] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui lead." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/leads?id=xxx — hapus sebuah lead.
 */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const limited = await guardAdminMutation(check.uid, "lead.delete", {
    limit: 20,
  });
  if (limited) return limited;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Admin SDK tidak tersedia." },
      { status: 503 },
    );
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    await db.collection("leads").doc(id).delete();
    await recordAdminAudit({
      action: "lead.delete",
      actor: check.email,
      target: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/leads] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus lead." }, { status: 500 });
  }
}
