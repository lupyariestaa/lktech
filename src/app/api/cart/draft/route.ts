import { NextResponse } from "next/server";
import { requireUser } from "@/lib/admin-guard";
import { getUserProfile } from "@/lib/user-profile";
import {
  clearCartDraft,
  saveCartDraft,
  setCartOptOut,
} from "@/lib/cart-draft";
import { cartDraftSchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cart/draft — simpan draft keranjang server-side (FASE P5).
 * Body: { items: [{slug,name,price,qty,variantSlug?}], subtotal }
 *
 * Dipakai klien untuk sinkronisasi keranjang (best-effort). Keranjang kosong →
 * draft dihapus. Draft dipakai cron pengingat H+1.
 */
export async function POST(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`cart-draft:${check.uid}`, 120, 10 * 60 * 1000);
  if (!rl.ok) {
    // Best-effort: jangan ganggu UX; cukup balas 200 tanpa menyimpan.
    return NextResponse.json({ ok: true, throttled: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = cartDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data keranjang tidak valid." }, { status: 400 });
  }

  try {
    const profile = await getUserProfile(check.uid).catch(() => null);
    const ok = await saveCartDraft(check.uid, {
      email: check.email,
      displayName: profile?.displayName ?? "",
      items: parsed.data.items.map((it) => ({
        slug: it.slug,
        name: it.name ?? "",
        price: it.price,
        qty: it.qty,
        variantSlug: it.variantSlug,
      })),
      subtotal: parsed.data.subtotal,
    });
    return NextResponse.json({ ok });
  } catch (err) {
    console.error("[api/cart/draft] POST gagal:", err);
    // Best-effort: jangan gagalkan UX klien.
    return NextResponse.json({ ok: false });
  }
}

/**
 * DELETE /api/cart/draft — hapus draft (keranjang dikosongkan / setelah checkout).
 * Query: ?optout=1 → berhenti diingatkan (opt-out, bukan sekadar hapus).
 */
export async function DELETE(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  const url = new URL(req.url);
  try {
    if (url.searchParams.get("optout") === "1") {
      await setCartOptOut(check.uid, true);
      return NextResponse.json({ ok: true, optedOut: true });
    }
    await clearCartDraft(check.uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/cart/draft] DELETE gagal:", err);
    return NextResponse.json({ ok: false });
  }
}
