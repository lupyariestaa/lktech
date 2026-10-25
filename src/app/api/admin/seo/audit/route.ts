import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { seoAuditRunSchema } from "@/lib/api-schemas";
import { guardAdminMutation } from "@/lib/admin-rate-limit";
import { recordAdminAudit } from "@/lib/admin-audit";
import { SITE_URL } from "@/lib/site";
import { DEFAULT_SEO_AUDIT_LIMITS } from "@/lib/seo-audit-pure";
import {
  AUDIT_INVENTORY_GROUPS,
  buildAuditInventory,
  selectInventory,
  type AuditInventoryGroup,
} from "@/lib/seo-inventory";
import { emptyAuditReport, runSeoAudit } from "@/lib/seo-crawler";
import { getLatestSeoAudit, saveSeoAudit } from "@/lib/seo-audit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Crawler berjalan sinkron; beri ruang hingga beberapa timeout per permintaan. */
export const maxDuration = 60;

/** Daftar grup inventaris yang sah (dipakai UI). */
function isAuditGroup(value: string): value is AuditInventoryGroup {
  return (AUDIT_INVENTORY_GROUPS as readonly string[]).includes(value);
}

/**
 * GET /api/admin/seo/audit — hasil audit teknis TERAKHIR (bila ada).
 * Tidak menjalankan crawl; hanya membaca hasil tersimpan.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const latest = await getLatestSeoAudit();
  return NextResponse.json(
    latest
      ? { available: true, id: latest.id, createdAt: latest.createdAt, actor: latest.actor, report: latest.report }
      : { available: false, report: null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/admin/seo/audit — jalankan audit SEO teknis ON-DEMAND.
 *
 * Crawler internal berlingkup kecil (same-origin) memeriksa inventaris URL
 * publik. Tidak ada penjadwalan otomatis; tidak ada perubahan pada situs.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const limited = await guardAdminMutation(check.uid, "seo.audit_run", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = seoAuditRunSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const groups = (parsed.data.groups ?? []).filter(isAuditGroup);
  const maxUrls = Math.min(
    parsed.data.maxUrls ?? DEFAULT_SEO_AUDIT_LIMITS.maxUrls,
    DEFAULT_SEO_AUDIT_LIMITS.maxUrls,
  );

  const inventory = await buildAuditInventory();
  const selected = selectInventory(inventory, {
    groups: groups.length > 0 ? groups : undefined,
    maxUrls,
  });

  if (selected.items.length === 0) {
    return NextResponse.json(
      { report: emptyAuditReport(SITE_URL), saved: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let report;
  try {
    report = await runSeoAudit({
      origin: SITE_URL,
      items: selected.items,
      inventorySize: inventory.length,
      truncated: selected.truncated,
    });
  } catch (err) {
    console.error("[seo-audit] gagal menjalankan audit:", err);
    return NextResponse.json(
      { error: "Audit gagal dijalankan. Coba lagi nanti.", code: "audit_failed" },
      { status: 502 },
    );
  }

  if (parsed.data.save !== false) {
    await saveSeoAudit(report, check.email);
  }

  await recordAdminAudit({
    action: "seo.audit_run",
    actor: check.email,
    target: report.origin,
    meta: {
      ruleVersion: report.ruleVersion,
      pages: report.summary.pages,
      critical: report.summary.bySeverity.critical,
      high: report.summary.bySeverity.high,
      truncated: report.truncated,
    },
  });

  return NextResponse.json(
    { report, saved: parsed.data.save !== false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
