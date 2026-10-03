import { NextResponse } from "next/server";
import { requireActiveUser, requireUser } from "@/lib/admin-guard";
import {
  addAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from "@/lib/user-profile";
import { addressSchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas mutasi alamat per user dalam satu jendela waktu. */
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/** GET /api/user/addresses — daftar alamat user. */
export async function GET(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  try {
    const addresses = await listAddresses(check.uid);
    return NextResponse.json({ addresses });
  } catch (err) {
    console.error("[api/user/addresses] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat alamat." },
      { status: 500 },
    );
  }
}

/** POST /api/user/addresses — tambah alamat baru. */
export async function POST(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`address:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data alamat tidak valid." },
      { status: 400 },
    );
  }

  try {
    const addresses = await addAddress(check.uid, {
      label: parsed.data.label,
      recipient: parsed.data.recipient,
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      postalCode: parsed.data.postalCode,
      note: parsed.data.note,
      isPrimary: parsed.data.isPrimary ?? false,
    });
    if (addresses === null) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, addresses });
  } catch (err) {
    console.error("[api/user/addresses] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan alamat." },
      { status: 500 },
    );
  }
}

/** PATCH /api/user/addresses?id= — perbarui alamat / jadikan utama. */
export async function PATCH(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  // Untuk PATCH, semua field opsional (partial update).
  const parsed = addressSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data alamat tidak valid." },
      { status: 400 },
    );
  }

  try {
    const addresses = await updateAddress(check.uid, id, parsed.data);
    if (addresses === null) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, addresses });
  } catch (err) {
    console.error("[api/user/addresses] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui alamat." },
      { status: 500 },
    );
  }
}

/** DELETE /api/user/addresses?id= — hapus alamat. */
export async function DELETE(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const addresses = await deleteAddress(check.uid, id);
    if (addresses === null) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, addresses });
  } catch (err) {
    console.error("[api/user/addresses] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus alamat." },
      { status: 500 },
    );
  }
}
