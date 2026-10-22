import "server-only";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Rate-limit aksi admin yang destruktif (ADM-07).
 *
 * Dipisah dari `requireAdmin` agar hanya endpoint mutasi berisiko yang kena.
 * Default 20 aksi / 10 menit per uid; endpoint bisa menaikkan/menurunkan.
 * Mengembalikan `NextResponse` 429 siap pakai, atau `null` bila lolos.
 */
export async function guardAdminMutation(
  uid: string,
  action: string,
  opts: { limit?: number; windowMs?: number } = {},
): Promise<NextResponse | null> {
  const limit = opts.limit ?? 20;
  const windowMs = opts.windowMs ?? 10 * 60 * 1000;
  const rl = await checkRateLimit(`admin-mutation:${action}:${uid}`, limit, windowMs);
  if (rl.ok) return null;

  return NextResponse.json(
    {
      error: "Terlalu banyak aksi admin. Coba lagi nanti.",
      code: "admin_rate_limited",
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, rl.retryAfter)) },
    },
  );
}
