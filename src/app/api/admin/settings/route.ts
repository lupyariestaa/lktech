import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  readSiteSettingsDoc,
  saveSiteSettings,
  mergeSettings,
} from "@/lib/settings";
import { CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import { settingsSchema } from "@/lib/api-schemas";
import {
  getBuyerEmailFrom,
  isBuyerEmailConfigured,
  isBuyerEmailTestOnly,
} from "@/lib/email-order";
import type { SiteSettings } from "@/lib/settings-types";
import { recordAdminAudit } from "@/lib/admin-audit";
import { VersionConflictError } from "@/lib/optimistic-lock-pure";

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

  const { settings, version } = await readSiteSettingsDoc();
  const emailHealth = {
    configured: isBuyerEmailConfigured,
    testOnly: isBuyerEmailTestOnly,
    from: getBuyerEmailFrom(),
  };
  return NextResponse.json(
    { settings, emailHealth, version },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

/**
 * PUT /api/admin/settings — simpan pengaturan situs (dilindungi admin).
 */
export async function PUT(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: Partial<SiteSettings> & { expectedVersion?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  // ADM-11: versi yang dimuat klien terakhir (opsional; absen = tanpa cek).
  const expectedVersion = body.expectedVersion;

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    // Pesan jelas per-field (gap G11) — bukan generik "tidak valid".
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? first.path.join(".") : "";
    const detail = first?.message ?? "Data tidak sesuai.";
    return NextResponse.json(
      {
        error: path ? `Field "${path}": ${detail}` : detail,
        issues: parsed.error.issues.map((iss) => ({
          path: iss.path.join("."),
          message: iss.message,
        })),
      },
      { status: 400 },
    );
  }

  const settings = mergeSettings(parsed.data);

  try {
    const version = await saveSiteSettings(settings, check.email, expectedVersion);

    // Pastikan halaman publik yang menampilkan kontak langsung segar
    // (kontak dipakai di footer/beranda & halaman kontak).
    revalidateTag(CACHE_TAGS.settings, REVALIDATE_NOW);
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/kontak");
    // Mode pemeliharaan (G7): agar halaman /maintenance ikut segar saat toggle.
    revalidatePath("/maintenance");

    await recordAdminAudit({
      action: "settings.update",
      actor: check.email,
      target: "site",
    });

    return NextResponse.json({ ok: true, settings, version });
  } catch (err) {
    if (err instanceof VersionConflictError) {
      // ADM-11: admin lain sudah menyimpan lebih dulu → jangan timpa.
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          currentVersion: err.currentVersion,
        },
        { status: 409 },
      );
    }
    console.error("[api/admin/settings] PUT gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 },
    );
  }
}
