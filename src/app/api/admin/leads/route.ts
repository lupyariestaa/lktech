import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { LEAD_STATUSES, type LeadStatus, type StoredLead, type LeadActivity } from "@/lib/lead-types";
import { isPipelineStage, statusToStage } from "@/lib/lead-scoring-pure";
import { updateLeadStage, addLeadActivity } from "@/lib/lead-crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/leads — daftar semua lead (terbaru lebih dulu).
 * GET /api/admin/leads?summary=1 — ringkasan jumlah per status (untuk
 * badge sidebar; jangan tarik semua dokumen).
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

  // Ringkasan count per status untuk badge sidebar (response kecil).
  const wantsSummary = new URL(req.url).searchParams.get("summary") === "1";
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
      return NextResponse.json(
        { summary: counts },
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
    const snap = await db
      .collection("leads")
      .orderBy("createdAtISO", "desc")
      .get();

    const leads: StoredLead[] = snap.docs.map((doc) => {
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
    });

    return NextResponse.json({ leads });
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/leads] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus lead." }, { status: 500 });
  }
}
