import { getIdToken } from "@/lib/auth";

/**
 * Logout admin: cabut sesi server (refresh token) lalu hapus cookie.
 *
 * `revoke: true` mengirim Bearer ID token agar server dapat memanggil
 * `revokeRefreshTokens`. Bila token tidak tersedia, endpoint masih memakai
 * session cookie sebagai fallback. Best-effort: kegagalan jaringan tidak
 * menghalangi `signOutUser` di klien.
 */
export async function clearAdminSession(
  opts: { revoke?: boolean } = {},
): Promise<void> {
  let token: string | null = null;
  if (opts.revoke) {
    try {
      token = await getIdToken();
    } catch {
      /* lanjut tanpa Bearer; server memakai cookie */
    }
  }

  try {
    await fetch("/api/admin/session", {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
  } catch {
    /* abaikan */
  }
}

/**
 * Memverifikasi keanggotaan admin lalu membuat session cookie (HttpOnly).
 * Mengembalikan `true` bila berhasil (pemanggil boleh lanjut ke dashboard).
 */
export async function startAdminSession(): Promise<boolean> {
  const token = await getIdToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}



/**
 * Header otorisasi untuk request ke API admin.
 * Menyertakan token Firebase bila user sedang login.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Error dari API admin yang membawa konteks tambahan (mis. daftar `usedIn`
 * saat hapus permanen ditolak karena aset masih dipakai).
 */
export class ApiError extends Error {
  usedIn?: Array<{ type: string; refId: string; label: string; field: string }>;
  status: number;
  constructor(
    message: string,
    status: number,
    usedIn?: ApiError["usedIn"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.usedIn = usedIn;
  }
}

/**
 * Membaca body response JSON; melempar `ApiError` dengan pesan dari server
 * (`{ error }`) bila status tidak OK. Dipakai bersama oleh `admin-api` &
 * `admin-content-api` agar penanganan error konsisten.
 */
export async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Terjadi kesalahan.";
    let usedIn: ApiError["usedIn"];
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (Array.isArray(data?.usedIn)) usedIn = data.usedIn;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, usedIn);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch ringkas ke API admin: otomatis menyisipkan header otorisasi,
 * default `no-store`, lalu memproses hasil dengan `handle`.
 */
export async function adminFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
    cache: init?.cache ?? "no-store",
  });
  return handle<T>(res);
}
