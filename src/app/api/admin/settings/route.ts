import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { mergeSettings, SETTINGS_DOC_ID } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/settings — simpan pengaturan situs (dilindungi admin).
 */
export async function PUT(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Admin SDK tidak tersedia." },
      { status: 503 },
    );
  }

  let body: Partial<SiteSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const settings = mergeSettings(body);

  try {
    await db
      .collection("settings")
      .doc(SETTINGS_DOC_ID)
      .set(
        {
          ...settings,
          updatedAtISO: new Date().toISOString(),
          updatedBy: check.email,
        },
        { merge: true },
      );

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/admin/settings] PUT gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 },
    );
  }
}
