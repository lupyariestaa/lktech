import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { LEAD_STATUSES, type LeadStatus, type StoredLead } from "@/lib/lead-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/leads — daftar semua lead (terbaru lebih dulu).
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
 * PATCH /api/admin/leads — ubah status sebuah lead.
 * Body: { id: string, status: LeadStatus }
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

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json(
      { error: "id dan status wajib diisi." },
      { status: 400 },
    );
  }

  if (!LEAD_STATUSES.includes(status as LeadStatus)) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  try {
    await db.collection("leads").doc(id).update({
      status,
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
