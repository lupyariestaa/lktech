import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/session-constants";
import { verifyAdminSessionCookie } from "@/lib/session";
import { isAdminEmail } from "@/lib/admins";

/**
 * Gerbang admin SERVER-SIDE (gap G6) — dijalankan di layout `/admin/(dashboard)`.
 *
 * Sebelumnya gate `/admin` hanya cek KEBERADAAN cookie di proxy (edge) — siapa
 * pun yang menyetel cookie `__session` apa pun bisa memuat shell dashboard.
 * Komponen ini memverifikasi cookie secara KRIPTOGRAFIS (`verifySessionCookie`)
 * & mengecek keanggotaan admin SEBELUM anak dirender, sehingga data server yang
 * dibaca via Admin SDK tidak pernah sampai ke non-admin.
 *
 * Bila tidak valid → redirect ke `/admin/login`. Proxy (edge) tetap jadi lapisan
 * pertama yang cepat; ini lapisan kedua yang otoritatif.
 */
export async function AdminServerGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const cookie = store.get(ADMIN_SESSION_COOKIE)?.value;

  const session = await verifyAdminSessionCookie(cookie);
  if (!session || !session.emailVerified) {
    redirect("/admin/login");
  }

  const allowed = await isAdminEmail(session.email);
  if (!allowed) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
