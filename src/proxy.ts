import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/session-constants";

/**
 * Proxy gate untuk area `/admin` (konvensi Next.js 16; sebelumnya `middleware`).
 *
 * Defense-in-depth: memblokir pengiriman shell dashboard ke pengunjung yang
 * TIDAK punya session cookie admin sama sekali (redirect ke `/admin/login`).
 * Verifikasi kriptografis sesi + whitelist admin tetap dilakukan di API
 * (`requireAdmin`) — cookie ini hanya lapisan tambahan, bukan satu-satunya.
 *
 * Catatan: file ini TIDAK boleh mengimpor modul server-only (firebase-admin)
 * karena berjalan di runtime edge.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Halaman login admin tidak butuh sesi.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    // Simpan tujuan agar bisa kembali setelah login (path relatif internal).
    if (pathname !== "/admin") {
      url.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Lindungi semua halaman admin, kecuali aset statis & API admin.
  matcher: ["/admin/:path*"],
};
