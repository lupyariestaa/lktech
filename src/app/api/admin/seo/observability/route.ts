import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getObservabilitySnapshot } from "@/lib/seo-observability";
import { parseDisabledFeatures, resolveSeoFlags } from "@/lib/seo-flags-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/seo/observability — metrik operasional SEO (fase D7).
 *
 * Mengembalikan status aktif/nonaktif fitur (kill switch) dan agregat metrik
 * per provider (sukses/gagal, kode error, quota, latency). Tanpa data sensitif:
 * tidak ada query, URL halaman, email, atau token. Metrik bersifat per-proses.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const flags = resolveSeoFlags(parseDisabledFeatures(process.env.SEO_DISABLED_FEATURES));
  return NextResponse.json(
    { observability: getObservabilitySnapshot(), flags },
    { headers: { "Cache-Control": "no-store" } },
  );
}
