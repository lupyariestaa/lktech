import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSiteSettings, mergeSettings, SETTINGS_DOC_ID } from "@/lib/settings";
import { settingsSchema } from "@/lib/api-schemas";
import {
  getBuyerEmailFrom,
  isBuyerEmailConfigured,
  isBuyerEmailTestOnly,
} from "@/lib/email-order";
import type { SiteSettings } from "@/lib/settings-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings — pengaturan segar untuk dashboard (dilindungi admin).
 *
 * Dashboard TIDAK boleh membaca `/api/settings` publik karena risiko cache;
 * endpoint ini selalu `no-store` sehingga form selalu menampilkan data terbaru.
 *
 * Ikut mengirim `emailHealth` (`EM-C1`/`EM-H4`): status konfigurasi email
 * pembeli agar admin tahu bila pengiriman belum siap di produksi.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const settings = await getSiteSettings();
  const emailHealth = {
    configured: isBuyerEmailConfigured,
    testOnly: isBuyerEmailTestOnly,
    from: getBuyerEmailFrom(),
  };
  return NextResponse.json(
    { settings, emailHealth },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

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

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data pengaturan tidak valid." },
      { status: 400 },
    );
  }

  const settings = mergeSettings(parsed.data);

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

    // Pastikan halaman publik yang menampilkan kontak langsung segar
    // (kontak dipakai di footer/beranda & halaman kontak).
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/kontak");

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/admin/settings] PUT gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 },
    );
  }
}
