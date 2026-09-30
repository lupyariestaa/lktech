import { getIdToken } from "@/lib/auth";

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
 * Membaca body response JSON; melempar `Error` dengan pesan dari server
 * (`{ error }`) bila status tidak OK. Dipakai bersama oleh `admin-api` &
 * `admin-content-api` agar penanganan error konsisten.
 */
export async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Terjadi kesalahan.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
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
