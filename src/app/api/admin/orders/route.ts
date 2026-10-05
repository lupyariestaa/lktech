import { NextResponse } from "next/server";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  deleteOrder,
  getOrderById,
  getOrdersForDay,
  getOrdersPage,
  getOrdersSummary,
  updateOrderStatus,
} from "@/lib/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-types";
import { sendOrderStatusToBuyer, sendOrderConfirmationToBuyer } from "@/lib/email-order";
import {
  recordStatusEmail,
  recordOrderEmailStatus,
  logOrderEmail,
  listOrderEmails,
} from "@/lib/email-status";
import { restoreCouponUsage } from "@/lib/coupons";
import { getSiteSettings } from "@/lib/settings";
import { releaseOrderDownload, createManualOrderInvoice } from "@/lib/order-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders — daftar pesanan (terbaru dulu) + filter & paginasi.
 *   Query: ?status=baru|menunggu_bayar|dibayar|menunggu_konfirmasi|diproses|selesai|dibatalkan|kedaluwarsa|semua
 *          ?limit=<1..100>  ?cursor=<createdAtISO>
 * GET /api/admin/orders?summary=1 — ringkasan jumlah per status + omzet
 *   (untuk badge sidebar & metrik dashboard).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const url = new URL(req.url);

  // Riwayat email sebuah order (`EM-P1`) — tanpa mengunduh daftar.
  const emailsFor = url.searchParams.get("emails");
  if (emailsFor) {
    try {
      const emails = await listOrderEmails(emailsFor);
      return NextResponse.json(
        { emails },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/orders] GET emails gagal:", err);
      return NextResponse.json(
        { error: "Gagal mengambil riwayat email." },
        { status: 500 },
      );
    }
  }

  // Drill-down analitik (`AN-P2`): daftar pesanan satu hari.
  const date = url.searchParams.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    try {
      const dayOrders = await getOrdersForDay(date);
      return NextResponse.json(
        { orders: dayOrders },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/orders] GET date gagal:", err);
      return NextResponse.json(
        { error: "Gagal mengambil pesanan tanggal tersebut." },
        { status: 500 },
      );
    }
  }

  // Ringkasan (badge/metrik) — tanpa mengunduh daftar.
  if (url.searchParams.get("summary") === "1") {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Admin SDK tidak tersedia." },
        { status: 503 },
      );
    }
    try {
      const summary = await getOrdersSummary();
      return NextResponse.json(
        { summary },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/orders] summary gagal:", err);
      return NextResponse.json(
        { error: "Gagal menghitung pesanan." },
        { status: 500 },
      );
    }
  }

  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && statusParam !== "semua"
      ? (ORDER_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as OrderStatus)
        : undefined
      : "semua";
  const cursor = url.searchParams.get("cursor");
  const limitRaw = Number(url.searchParams.get("limit"));

  try {
    const { orders, nextCursor } = await getOrdersPage({
      status,
      cursor,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    });
    return NextResponse.json(
      { orders, nextCursor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/orders] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data pesanan." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/orders — ubah status sebuah pesanan.
 * Body: { id: string, status: OrderStatus }
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

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
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  try {
    const { previousStatus } = await updateOrderStatus(
      id,
      status as OrderStatus,
      check.email,
    );

    // `EM-C3`: idempotensi — bila status tidak berubah, jangan kirim email lagi.
    if (previousStatus === status) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    // `KP-C2`: transisi → dibatalkan/kedaluwarsa mengembalikan kuota kupon
    // (sekali saja, karena hanya terjadi pada transisi status).
    if (
      (status === "dibatalkan" || status === "kedaluwarsa") &&
      previousStatus !== status
    ) {
      const order = await getOrderById(id);
      if (order?.coupon?.couponId) {
        await restoreCouponUsage(order.coupon.couponId, order.uid);
      }
    }

    // Email update status ke pembeli (`EM-C2`/`EM-H3`): dijalankan SETELAH
    // respons via `after()` (andalkan Next.js, bukan background `.then()` yang
    // bisa hilang di serverless). Status kirim dicatat ke order.
    after(async () => {
      try {
        const settings = await getSiteSettings();
        if (!settings.notifyBuyerOnStatus) return;
        const order = await getOrderById(id);
        if (!order) return;
        // Hindari email ganda untuk status yang sama (cek ulang dari order).
        if (order.lastNotifiedStatus === status) return;
        const result = await sendOrderStatusToBuyer(order, status as OrderStatus);
        await recordStatusEmail(id, status, result);
        await logOrderEmail(id, {
          kind: "status",
          to: order.buyerEmail,
          result,
        });
      } catch (err) {
        console.error("[api/admin/orders] gagal kirim email status:", err);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/orders] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui status pesanan." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/orders — aksi ke pesanan.
 * Body:
 *   - { id, kind?: "confirmation" | "status" } — kirim ulang email ke pembeli.
 *   - { id, action: "fulfill" }                 — buat/segarkan link unduhan
 *     (untuk order digital yang sudah dibayar; mis. berkas baru ditambahkan).
 *   - { id, action: "invoice" }                 — buat invoice manual Mayar
 *     (FASE P2; umumnya order JASA setelah kesepakatan).
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: { id?: string; kind?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  // ===== Aksi: buat invoice manual (Mayar) — FASE P2 (umumnya JASA) =====
  if (body.action === "invoice") {
    try {
      const res = await createManualOrderInvoice(id);
      if (!res.ok) {
        const msg =
          res.reason === "mayar_disabled"
            ? "Gateway pembayaran (Mayar) belum dikonfigurasi. Isi MAYAR_API_KEY."
            : res.reason === "already_paid"
              ? "Pesanan ini sudah dibayar."
              : res.reason === "not_found"
                ? "Pesanan tidak ditemukan."
                : res.reason === "final_status"
                  ? "Pesanan sudah final (dibatalkan/kedaluwarsa/selesai) — tidak bisa dibuat invoice."
                  : res.reason === "no_amount"
                    ? "Total pesanan 0 — tidak bisa dibuat invoice."
                    : "Gagal membuat invoice manual.";
        const status = res.reason === "not_found" ? 404 : 409;
        return NextResponse.json({ error: msg, code: res.reason }, { status });
      }
      return NextResponse.json({
        ok: true,
        payUrl: res.payUrl,
        invoiceId: res.invoiceId,
        expiresAt: res.expiresAt,
        reused: res.reused ?? false,
      });
    } catch (err) {
      console.error("[api/admin/orders] invoice manual gagal:", err);
      return NextResponse.json(
        { error: "Gagal membuat invoice manual (Mayar)." },
        { status: 500 },
      );
    }
  }

  // ===== Aksi: buat/segarkan link unduhan =====
  if (body.action === "fulfill") {
    try {
      const order = await getOrderById(id);
      if (!order) {
        return NextResponse.json(
          { error: "Pesanan tidak ditemukan." },
          { status: 404 },
        );
      }
      const res = await releaseOrderDownload(id);
      if (!res.ok) {
        const msg =
          res.reason === "no_files"
            ? "Produk pada pesanan ini belum memiliki berkas unduhan. Isi bagian 'Unduhan Otomatis' di produk terlebih dahulu."
            : res.reason === "download_disabled"
              ? "Fitur unduhan belum dikonfigurasi (DOWNLOAD_TOKEN_SECRET/MAYAR_API_KEY kosong)."
              : "Gagal membuat link unduhan.";
        return NextResponse.json(
          { error: msg, code: res.reason },
          { status: 409 },
        );
      }
      return NextResponse.json({
        ok: true,
        downloadUrl: res.downloadUrl,
        files: res.files,
      });
    } catch (err) {
      console.error("[api/admin/orders] fulfill gagal:", err);
      return NextResponse.json(
        { error: "Gagal membuat link unduhan." },
        { status: 500 },
      );
    }
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const kind =
      body.kind === "confirmation" || body.kind === "status"
        ? body.kind
        : order.status === "baru"
          ? "confirmation"
          : "status";

    const previous = await listOrderEmails(id, 200);
    const attempt =
      previous.filter((e) => e.kind === kind).length;

    const result =
      kind === "confirmation"
        ? await sendOrderConfirmationToBuyer(order)
        : await sendOrderStatusToBuyer(order, order.status);

    if (kind === "confirmation") {
      await recordOrderEmailStatus(id, "confirmation", result);
    } else {
      await recordStatusEmail(id, order.status, result);
    }
    await logOrderEmail(id, {
      kind: "resend",
      to: order.buyerEmail,
      result,
      attempt,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.skipped
            ? "Email pembeli belum dikonfigurasi (RESEND_API_KEY kosong)."
            : `Gagal mengirim email (${result.error ?? "unknown"}).`,
          result,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[api/admin/orders] POST resend gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengirim ulang email." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/orders?id=xxx — hapus sebuah pesanan (permanen).
 *
 * `EM-H1`/`KP-C2`: hard-delete hanya diizinkan untuk pesanan yang BELUM
 * diproses/dipenuhi (status `baru`, `menunggu_bayar`, `menunggu_konfirmasi`,
 * `kedaluwarsa`) — belum ada komitmen/kerja ke pembeli. Untuk status lain,
 * arahkan admin membatalkan pesanan (yang mengembalikan kuota + mengirim email).
 * Bila tetap dihapus & pesanan memakai kupon, kuota dikembalikan agar tidak bocor.
 */
const DELETABLE_STATUSES: readonly OrderStatus[] = [
  "baru",
  "menunggu_bayar",
  "menunggu_konfirmasi",
  "kedaluwarsa",
];

export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    if (!DELETABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            "Pesanan yang sudah diproses tidak dapat dihapus. Ubah status menjadi “Dibatalkan” agar kuota kupon dikembalikan & pembeli diberi tahu.",
          code: "delete_blocked",
        },
        { status: 409 },
      );
    }

    await deleteOrder(id);

    // Kembalikan kuota kupon (bila ada) agar tidak bocor (`KP-C2`).
    if (order.coupon?.couponId) {
      await restoreCouponUsage(order.coupon.couponId, order.uid);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/orders] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pesanan." },
      { status: 500 },
    );
  }
}
