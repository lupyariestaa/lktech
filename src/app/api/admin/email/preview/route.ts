import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  SAMPLE_DOWNLOAD_LINK,
  buildSampleOrder,
  renderOrderConfirmationEmail,
  renderOrderPaidEmail,
  renderOrderStatusEmail,
  type EmailTemplate,
} from "@/lib/email-order";
import {
  isEmailPreviewStatus,
  isEmailPreviewTemplate,
} from "@/lib/email-preview-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email/preview — pratinjau (dry-run) template email pembeli
 * (`EM-P3`), dilindungi admin.
 *
 * Sifat:
 * - **Read-only & tidak pernah mengirim**: hanya menyusun template memakai
 *   **pesanan contoh** deterministik (`buildSampleOrder()`) — tidak membaca
 *   data nyata & tidak memanggil Resend.
 * - **Tanpa input pengguna** untuk isi: hanya `template`/`status` dari whitelist.
 * - Tanpa rahasia di respons.
 *
 * Query: `?template=confirmation|paid|status[&status=<OrderStatus>]`.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const params = new URL(req.url).searchParams;
  const template = params.get("template");
  if (!isEmailPreviewTemplate(template)) {
    return NextResponse.json(
      { error: "Template pratinjau tidak dikenal." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const order = buildSampleOrder();
  let rendered: EmailTemplate | null;

  if (template === "confirmation") {
    rendered = renderOrderConfirmationEmail(order);
  } else if (template === "paid") {
    rendered = renderOrderPaidEmail(order, SAMPLE_DOWNLOAD_LINK);
  } else {
    const status = params.get("status");
    if (!isEmailPreviewStatus(status)) {
      return NextResponse.json(
        { error: "Status pratinjau tidak valid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    rendered = renderOrderStatusEmail(order, status);
  }

  if (!rendered) {
    return NextResponse.json(
      { error: "Template tidak tersedia untuk pilihan ini." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { template, sample: true, ...rendered },
    { headers: { "Cache-Control": "no-store" } },
  );
}
