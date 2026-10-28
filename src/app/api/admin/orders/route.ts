import { NextResponse } from "next/server";
import { after } from "next/server";
import {
  assertFreshAuth,
  requireAdmin,
  requireFreshAdmin,
} from "@/lib/admin-guard";
import { isOwnerEmail } from "@/lib/admins";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  deleteOrder,
  getOrderById,
  getOrdersForDay,
  getOrdersPage,
  getOrdersSummary,
  getOrdersAttentionSummary,
  getOrdersByIds,
  attachBuyerPhotos,
  updateOrderStatus,
  markOrderPaid,
} from "@/lib/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-types";
import { parseOrdersFilter, type OrdersSort } from "@/lib/orders-filter-pure";
import { shortOrderCode } from "@/lib/format";
import { sendOrderStatusToBuyer, sendOrderConfirmationToBuyer } from "@/lib/email-order";
import {
  recordStatusEmail,
  recordOrderEmailStatus,
  logOrderEmail,
  listOrderEmails,
} from "@/lib/email-status";
import { restoreCouponUsage } from "@/lib/coupons";
import { shouldRestoreCoupon } from "@/lib/order-status-pure";
import { getSiteSettings } from "@/lib/settings";
import { releaseOrderDownload, createManualOrderInvoice, fulfillOrder } from "@/lib/order-payment";
import { relinkRecoveredInvoice, resolveInvoiceRecovery, recordPaymentProblem } from "@/lib/orders";
import { getInvoice, isInvoicePaid } from "@/lib/mayar";
import { recordAdminAudit } from "@/lib/admin-audit";
import { guardAdminMutation } from "@/lib/admin-rate-limit";
import { addOrderActivity } from "@/lib/order-activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hitung jumlah percobaan KIRIM ULANG email untuk sebuah order (`F-G16`).
 * Sebelumnya menghitung `kind === kind` padahal log resend tercatat dengan
 * `kind:"resend"`, sehingga `attempt` selalu salah. Kini menghitung entri
 * ber-`kind:"resend"` (semua resend = percobaan), ditambah 1 untuk percobaan ini.
 */
async function countResendAttempts(orderId: string): Promise<number> {
  const previous = await listOrderEmails(orderId, 200);
  return previous.filter((e) => e.kind === "resend").length + 1;
}

/**
 * Efek samping perubahan status pesanan yang SAMA untuk aksi tunggal (PATCH) &
 * massal (bulk) — agar perilaku konsisten (F-G3): catat timeline, kembalikan
 * kuota kupon, kirim email update status + notifikasi WhatsApp (via `after()`).
 *
 * Asumsi: status sudah berubah (`previousStatus !== next`). Pemanggil sudah
 * mencatat audit di jalurnya masing-masing.
 */
async function applyStatusChangeEffects(input: {
  id: string;
  previousStatus: OrderStatus | null;
  next: OrderStatus;
  actor: string;
}): Promise<void> {
  const { id, previousStatus, next, actor } = input;

  // Timeline aktivitas.
  await addOrderActivity(id, {
    type: "status",
    note: `Status: ${ORDER_STATUS_LABEL[previousStatus ?? "baru"]} → ${ORDER_STATUS_LABEL[next]}`,
    actor,
  });

  // `KP-C2`: transisi → dibatalkan/kedaluwarsa mengembalikan kuota kupon.
  if (shouldRestoreCoupon(previousStatus ?? "", next)) {
    const order = await getOrderById(id);
    if (order?.coupon?.couponId) {
      await restoreCouponUsage(order.coupon.couponId, order.uid);
    }
  }
}

/**
 * Kirim email update status + notifikasi WhatsApp ke pembeli via `after()`
 * (andalkan Next.js, bukan background `.then()` yang bisa hilang di serverless).
 * Dipakai aksi tunggal & massal agar konsisten (F-G3).
 */
function queueBuyerStatusNotifications(id: string, next: OrderStatus): void {
  after(async () => {
    try {
      const settings = await getSiteSettings();
      if (!settings.notifyBuyerOnStatus) return;
      const order = await getOrderById(id);
      if (!order) return;
      if (order.lastNotifiedStatus === next) return;
      const result = await sendOrderStatusToBuyer(order, next);
      await recordStatusEmail(id, next, result);
      await logOrderEmail(id, {
        kind: "status",
        to: order.buyerEmail,
        result,
      });
    } catch (err) {
      console.error("[api/admin/orders] gagal kirim email status:", err);
    }

    try {
      const { isWhatsAppConfigured, notifyWhatsAppOrderStatus } = await import(
        "@/lib/whatsapp-notify"
      );
      if (isWhatsAppConfigured()) {
        const { getUserProfile } = await import("@/lib/user-profile");
        const fresh = await getOrderById(id);
        const profile = fresh ? await getUserProfile(fresh.uid).catch(() => null) : null;
        const phone = profile?.whatsapp ?? "";
        if (fresh && phone) {
          await notifyWhatsAppOrderStatus(
            phone,
            shortOrderCode(fresh.id),
            ORDER_STATUS_LABEL[next],
            fresh.total,
          );
        }
      }
    } catch (err) {
      console.error("[api/admin/orders] gagal kirim WhatsApp:", err);
    }
  });
}

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

  // Ekspor massal PII (seluruh hasil filter) khusus OWNER (ADM-03).
  // Daftar halaman tetap bisa dibaca ADMIN untuk operasional.
  if (url.searchParams.get("export") === "1" && !isOwnerEmail(check.email)) {
    return NextResponse.json(
      { error: "Ekspor data pelanggan massal hanya dapat dilakukan OWNER." },
      { status: 403 },
    );
  }

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

  // Ringkasan "butuh perhatian" (FASE O5) — tanpa mengunduh daftar.
  // PENTING (F-G1): param `attention=1` HANYA untuk mode ringkasan ini. Filter
  // daftar "butuh perhatian" memakai `attentionFilter=1` agar tidak bertabrakan
  // (mode ini `return` lebih dulu, sehingga filter daftar tak akan pernah jalan).
  if (url.searchParams.get("attention") === "1") {
    try {
      const attention = await getOrdersAttentionSummary();
      return NextResponse.json(
        { attention },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/orders] attention gagal:", err);
      return NextResponse.json(
        { error: "Gagal menghitung pesanan yang butuh perhatian." },
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
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;

  // FASE O2/O3/O7: mode filter bernomor bila ada filter/sort/page/q.
  const filter = parseOrdersFilter(url.searchParams);
  const sortParam = url.searchParams.get("sort");
  const sort: OrdersSort | undefined =
    sortParam &&
    ["date_desc", "date_asc", "total_desc", "total_asc", "status"].includes(sortParam)
      ? (sortParam as OrdersSort)
      : undefined;
  const pageRaw = Number(url.searchParams.get("page"));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : undefined;
  const useFilterMode =
    Boolean(sort) ||
    Boolean(page) ||
    filter.status !== "semua" ||
    filter.datePreset !== "semua" ||
    filter.fulfillment !== "semua" ||
    filter.paymentStatus !== "semua" ||
    filter.coupon !== "semua" ||
    filter.minTotal !== null ||
    filter.maxTotal !== null ||
    filter.attention ||
    filter.q !== "";

  try {
    if (useFilterMode) {
      // Mode ekspor (F-G4): kembalikan SELURUH hasil filter (tanpa paginasi)
      // agar CSV mengikuti filter, bukan hanya halaman aktif.
      if (url.searchParams.get("export") === "1") {
        const result = await getOrdersPage({
          filter,
          sort,
          page: 1,
          limit: 100,
          all: true,
        });
        result.orders = await attachBuyerPhotos(result.orders);
        return NextResponse.json(
          {
            orders: result.orders,
            total: result.total ?? result.orders.length,
            truncated: result.truncated ?? false,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const result = await getOrdersPage({ filter, sort, page, limit });
      result.orders = await attachBuyerPhotos(result.orders);
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const { orders, nextCursor } = await getOrdersPage({ status, cursor, limit });
    return NextResponse.json(
      { orders: await attachBuyerPhotos(orders), nextCursor },
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
    // The transition is validated atomically against the status read in tx.
    const { previousStatus, changed, notFound, invalidTransition } = await updateOrderStatus(
      id,
      status as OrderStatus,
      check.email,
    );

    if (notFound) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    if (invalidTransition && previousStatus) {
      return NextResponse.json(
        {
          error: `Perubahan status dari "${ORDER_STATUS_LABEL[previousStatus]}" ke "${ORDER_STATUS_LABEL[status as OrderStatus]}" tidak diizinkan. Status pesanan telah berubah; muat ulang lalu coba lagi.`,
          code: "invalid_transition",
          from: previousStatus,
          to: status,
        },
        { status: 409 },
      );
    }

    // `EM-C3`: idempotensi — bila status tidak berubah, jangan kirim email lagi.
    if (!changed || previousStatus === status) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    await recordAdminAudit({
      action: "order.status",
      actor: check.email,
      target: id,
      meta: { from: previousStatus, to: status },
    });

    // Efek samping bersama (timeline + restore kupon) — sama dgn bulk (F-G3).
    await applyStatusChangeEffects({
      id,
      previousStatus,
      next: status as OrderStatus,
      actor: check.email,
    });

    // Email update status + notifikasi WhatsApp ke pembeli (via `after()`).
    queueBuyerStatusNotifications(id, status as OrderStatus);

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

  let body: {
    id?: string;
    kind?: string;
    action?: string;
    ids?: string[];
    status?: string;
    op?: "status" | "delete" | "resend";
    invoiceId?: string;
    transactionId?: string;
    payUrl?: string;
    expiresAt?: string;
    confirmNoInvoice?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  // ===== Aksi massal (FASE O4) — maks 50 item, validasi per-item =====
  if (body.action === "bulk") {
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "ids wajib diisi." }, { status: 400 });
    }
    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Aksi massal dibatasi maksimal 50 pesanan." },
        { status: 400 },
      );
    }
    if (body.op !== "status" && body.op !== "delete" && body.op !== "resend") {
      return NextResponse.json({ error: "op tidak valid." }, { status: 400 });
    }

    if (body.op === "delete") {
      const fresh = assertFreshAuth(check);
      if (!fresh.ok) return fresh.response;
      const limited = await guardAdminMutation(check.uid, "order.delete", {
        limit: 30,
      });
      if (limited) return limited;
    }

    const orders = await getOrdersByIds(ids);
    const applied: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    if (body.op === "status") {
      const target = body.status;
      if (!target || !(ORDER_STATUSES as readonly string[]).includes(target)) {
        return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
      }
      for (const order of orders) {
        const { previousStatus, changed, notFound, invalidTransition } = await updateOrderStatus(
          order.id,
          target as OrderStatus,
          check.email,
        );
        if (notFound) {
          skipped.push({ id: order.id, reason: "not_found" });
          continue;
        }
        if (invalidTransition) {
          skipped.push({ id: order.id, reason: "invalid_transition" });
          continue;
        }
        if (!changed || previousStatus === target) {
          skipped.push({ id: order.id, reason: "unchanged" });
          continue;
        }
        await recordAdminAudit({
          action: "order.status",
          actor: check.email,
          target: order.id,
          meta: { from: previousStatus, to: target, bulk: true },
        });
        // F-G3: samakan efek samping dgn aksi tunggal (timeline + restore kupon
        // + email status + WA per-order). Kegagalan efek samping tidak
        // menggagalkan perubahan status (sudah tersimpan).
        await applyStatusChangeEffects({
          id: order.id,
          previousStatus,
          next: target as OrderStatus,
          actor: check.email,
        });
        queueBuyerStatusNotifications(order.id, target as OrderStatus);
        applied.push(order.id);
      }
    } else if (body.op === "resend") {
      // Kirim ulang email ke pembeli untuk tiap order terpilih (F-G8) —
      // diproses di server (bukan loop klien) agar atomik-per-order, teraudit,
      // dan kegagalan dilaporkan lewat `skipped`.
      for (const order of orders) {
        try {
          const kind: "confirmation" | "status" =
            order.status === "baru" ? "confirmation" : "status";
          const attempt = await countResendAttempts(order.id);
          const result =
            kind === "confirmation"
              ? await sendOrderConfirmationToBuyer(order)
              : await sendOrderStatusToBuyer(order, order.status);
          if (kind === "confirmation") {
            await recordOrderEmailStatus(order.id, "confirmation", result);
          } else {
            await recordStatusEmail(order.id, order.status, result);
          }
          await logOrderEmail(order.id, {
            kind: "resend",
            to: order.buyerEmail,
            result,
            attempt,
          });
          if (!result.ok) {
            skipped.push({
              id: order.id,
              reason: result.skipped ? "email_not_configured" : "email_failed",
            });
            continue;
          }
          await recordAdminAudit({
            action: "order.resend_email",
            actor: check.email,
            target: order.id,
            meta: { kind, attempt, bulk: true },
          });
          await addOrderActivity(order.id, {
            type: "email",
            note: `Email ${kind === "confirmation" ? "konfirmasi" : "update status"} dikirim ulang.`,
            actor: check.email,
          });
          applied.push(order.id);
        } catch (err) {
          console.error("[api/admin/orders] bulk resend gagal:", order.id, err);
          skipped.push({ id: order.id, reason: "email_error" });
        }
      }
    } else {
      for (const order of orders) {
        // ADM-09: hapus order + kembalikan kuota kupon dalam SATU transaksi.
        // Tidak ada lagi jalur parsial "order hilang, kuota tertinggal".
        const deleted = await deleteOrder(order.id, DELETABLE_STATUSES);
        if (!deleted.ok) {
          skipped.push({ id: order.id, reason: deleted.reason });
          continue;
        }
        await recordAdminAudit({
          action: "order.delete",
          actor: check.email,
          target: order.id,
          meta: {
            status: deleted.status,
            couponRestored: deleted.couponRestored,
            bulk: true,
          },
        });
        applied.push(order.id);
      }
    }

    const found = new Set(orders.map((o) => o.id));
    for (const id of ids) {
      if (!found.has(id)) skipped.push({ id, reason: "not_found" });
    }

    return NextResponse.json({ ok: true, applied: applied.length, skipped });
  }

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  if (body.action === "invoice-reconcile") {
    const fresh = assertFreshAuth(check);
    if (!fresh.ok) return fresh.response;
    const limited = await guardAdminMutation(check.uid, "order.invoice.reconcile", { limit: 10 });
    if (limited) return limited;
    try {
      if (body.invoiceId?.trim()) {
        if (!body.payUrl?.trim()) {
          return NextResponse.json({ error: "URL invoice Mayar wajib diisi untuk mengaktifkan pembayaran." }, { status: 400 });
        }
        await relinkRecoveredInvoice(id, {
          invoiceId: body.invoiceId.trim(),
          ...(body.transactionId ? { transactionId: body.transactionId.trim() } : {}),
          ...(body.payUrl ? { payUrl: body.payUrl.trim() } : {}),
          ...(body.expiresAt ? { expiresAt: body.expiresAt.trim() } : {}),
        });
      } else {
        if (body.confirmNoInvoice !== true) {
          return NextResponse.json({ error: "Konfirmasi eksplisit bahwa invoice tidak ditemukan di Mayar wajib diisi." }, { status: 400 });
        }
        await resolveInvoiceRecovery(id);
      }
      await addOrderActivity(id, {
        type: "invoice",
        note: body.invoiceId ? "Invoice Mayar yatim ditautkan manual setelah verifikasi." : "Status invoice yatim diperiksa; tidak ada invoice baru yang dibuat.",
        actor: check.email,
      });
      await recordAdminAudit({ action: "order.invoice.reconcile", actor: check.email, target: id, meta: { linked: Boolean(body.invoiceId) } });
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Rekonsiliasi gagal." }, { status: 409 });
    }
  }

  // ===== Aksi: verifikasi status pembayaran invoice di Mayar =====
  // Rekonsiliasi berbasis BUKTI provider: mengambil status invoice langsung dari
  // Mayar. Hanya menandai lunas bila Mayar menyatakan `paid` DAN nominal invoice
  // sama persis dengan nominal tagihan order. Tidak pernah menebak nominal.
  if (body.action === "invoice-verify") {
    const fresh = assertFreshAuth(check);
    if (!fresh.ok) return fresh.response;
    const limited = await guardAdminMutation(check.uid, "order.invoice.verify", { limit: 20 });
    if (limited) return limited;
    try {
      const order = await getOrderById(id);
      if (!order) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
      }
      const payRef = order.payment?.invoiceId
        ? order.payment
        : order.servicePayment?.invoiceId
          ? order.servicePayment
          : undefined;
      if (!payRef?.invoiceId) {
        return NextResponse.json(
          {
            error: "Pesanan ini belum punya ID invoice Mayar. Buat invoice manual lebih dahulu.",
            code: "no_invoice",
          },
          { status: 409 },
        );
      }
      if (payRef.status === "dibayar") {
        return NextResponse.json({
          ok: true,
          paid: true,
          alreadyPaid: true,
          status: "paid",
          message: "Pesanan sudah ditandai lunas.",
        });
      }

      const detail = await getInvoice(payRef.invoiceId);
      const expected = payRef.amountExpected ?? order.total;
      if (detail.amount !== expected) {
        await recordPaymentProblem(id, {
          kind: "mismatch",
          received: detail.amount,
          expected,
          reason: "amount_mismatch",
        });
        return NextResponse.json(
          {
            error: `Nominal invoice Mayar (${detail.amount}) tidak sama dengan tagihan (${expected}). Pesanan TIDAK ditandai lunas.`,
            code: "amount_mismatch",
          },
          { status: 409 },
        );
      }
      if (!isInvoicePaid(detail.status)) {
        return NextResponse.json({
          ok: true,
          paid: false,
          status: detail.status,
          message: `Mayar melaporkan status invoice "${detail.status}" — belum lunas.`,
        });
      }

      const { applied, reason } = await markOrderPaid(
        id,
        {
          amount: detail.amount,
          invoiceId: payRef.invoiceId,
          ...(detail.transactionId ? { transactionId: detail.transactionId } : {}),
        },
        "dibayar",
      );
      if (!applied) {
        return NextResponse.json({
          ok: true,
          paid: false,
          status: detail.status,
          message:
            reason === "already_paid"
              ? "Pesanan sudah lunas."
              : "Pesanan tidak dapat ditandai lunas (status terminal).",
        });
      }

      try {
        await fulfillOrder(id);
      } catch (fulfillErr) {
        console.error("[api/admin/orders] fulfillment setelah verifikasi gagal:", fulfillErr);
      }
      await addOrderActivity(id, {
        type: "sistem",
        note: `Pembayaran diverifikasi lunas via Mayar (invoice ${payRef.invoiceId}).`,
        actor: check.email,
      });
      await recordAdminAudit({
        action: "order.invoice.verify",
        actor: check.email,
        target: id,
        meta: { invoiceId: payRef.invoiceId, amount: detail.amount },
      });
      return NextResponse.json({
        ok: true,
        paid: true,
        status: "paid",
        message: "Pembayaran terverifikasi di Mayar & pesanan ditandai lunas.",
      });
    } catch (err) {
      console.error("[api/admin/orders] invoice-verify gagal:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Gagal memverifikasi invoice." },
        { status: 409 },
      );
    }
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
                    : res.reason === "invoice_reconciliation_required"
                      ? "Invoice sebelumnya perlu direkonsiliasi dahulu. Jangan buat invoice baru sebelum status Mayar diperiksa."
                    : "Gagal membuat invoice manual.";
        const status = res.reason === "not_found" ? 404 : 409;
        return NextResponse.json({ error: msg, code: res.reason }, { status });
      }
      await recordAdminAudit({
        action: "order.invoice",
        actor: check.email,
        target: id,
        meta: { reused: res.reused ?? false },
      });
      await addOrderActivity(id, {
        type: "invoice",
        note: res.reused
          ? "Invoice manual dipakai ulang (tautan lama)."
          : "Invoice manual dibuat.",
        actor: check.email,
      });
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
      await recordAdminAudit({
        action: "order.fulfill",
        actor: check.email,
        target: id,
        meta: { files: res.files },
      });
      await addOrderActivity(id, {
        type: "sistem",
        note: `Link unduhan dibuat/disegarkan (${res.files ?? 0} berkas).`,
        actor: check.email,
      });
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

    const attempt = await countResendAttempts(id);

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
    await recordAdminAudit({
      action: "order.resend_email",
      actor: check.email,
      target: id,
      meta: { kind, attempt },
    });
    await addOrderActivity(id, {
      type: "email",
      note: `Email ${kind === "confirmation" ? "konfirmasi" : "update status"} dikirim ulang.`,
      actor: check.email,
    });
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
  const check = await requireFreshAdmin(req);
  if (!check.ok) return check.response;

  const limited = await guardAdminMutation(check.uid, "order.delete", {
    limit: 30,
  });
  if (limited) return limited;

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

    // ADM-09: order + kuota kupon dihapus/dikembalikan dalam SATU transaksi.
    // Status diperiksa ulang di dalam transaksi untuk menutup race condition.
    const deleted = await deleteOrder(id, DELETABLE_STATUSES);
    if (!deleted.ok) {
      if (deleted.reason === "not_found") {
        return NextResponse.json(
          { error: "Pesanan tidak ditemukan." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          error:
            "Pesanan yang sudah diproses tidak dapat dihapus. Ubah status menjadi “Dibatalkan” agar kuota kupon dikembalikan & pembeli diberi tahu.",
          code: "delete_blocked",
        },
        { status: 409 },
      );
    }

    await recordAdminAudit({
      action: "order.delete",
      actor: check.email,
      target: id,
      meta: {
        status: deleted.status,
        couponRestored: deleted.couponRestored,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/orders] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pesanan." },
      { status: 500 },
    );
  }
}
