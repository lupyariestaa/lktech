import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/session-constants";

/**
 * Proxy (konvensi Next.js 16; sebelumnya `middleware`).
 *
 * Dua tugas:
 * 1. **Gate area `/admin`** — blokir shell dashboard tanpa session cookie admin
 *    (redirect ke `/admin/login`). Verifikasi kriptografis tetap di API.
 * 2. **Mode pemeliharaan** — bila maintenance AKTIF, arahkan pengunjung umum ke
 *    `/maintenance` (via rewrite). Rute `/admin`, `/api`, `/maintenance`, `/masuk`,
 *    `/unduhan`, `/akun` dikecualikan agar admin & sistem tetap berjalan.
 *
 * Catatan: TIDAK boleh mengimpor modul server-only (firebase-admin) — berjalan
 * di runtime edge. Status maintenance diambil via fetch ke endpoint internal.
 */

/** Prefix rute yang dikecualikan dari pengalihan maintenance. */
const MAINTENANCE_EXEMPT = ["/admin", "/api", "/maintenance", "/masuk", "/unduhan", "/akun"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ===== 1. Gate admin =====
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    const hasSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      if (pathname !== "/admin") {
        url.searchParams.set("next", `${pathname}${search}`);
      }
      return NextResponse.redirect(url);
    }

    // Cookie ada tetapi bisa kedaluwarsa/tidak valid. Teruskan path awal agar
    // guard server bisa mengarahkan login dengan `next` yang benar (ADM-24).
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-request-path", `${pathname}${search}`);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // ===== 2. Mode pemeliharaan (rute publik) =====
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    MAINTENANCE_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(new URL("/api/maintenance-status", req.url), { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { enabled?: boolean };
      if (data.enabled === true) {
        const url = req.nextUrl.clone();
        url.pathname = "/maintenance";
        url.search = "";
        return NextResponse.rewrite(url);
      }
    }
  } catch {
    /* fail-safe: lanjutkan normal */
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan untuk semua rute halaman (kecuali aset statis Next).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
