import { getIdToken } from "@/lib/auth";
import type { Product } from "@/lib/product-types";
import type { SavedAddress } from "@/lib/user-types";

/**
 * Klien API untuk fitur portal akun (wishlist & alamat).
 *
 * Semua permintaan menyertakan ID token Firebase (Bearer) agar server dapat
 * memverifikasi user lewat `requireUser`. uid/email TIDAK pernah dikirim dari
 * klien — selalu diambil dari token di server.
 */

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return { Authorization: `Bearer ${token}` };
}

// ===== Wishlist =====

export type WishlistResult = { wishlist: string[]; products: Product[] };

export async function fetchWishlist(): Promise<WishlistResult> {
  const res = await fetch("/api/user/wishlist", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memuat favorit.");
  return {
    wishlist: (data?.wishlist ?? []) as string[],
    products: (data?.products ?? []) as Product[],
  };
}

export async function addWishlist(slug: string): Promise<string[]> {
  const res = await fetch("/api/user/wishlist", {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal menambahkan favorit.");
  return (data?.wishlist ?? []) as string[];
}

export async function removeWishlist(slug: string): Promise<string[]> {
  const res = await fetch(
    `/api/user/wishlist?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE", headers: await authHeaders() },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal menghapus favorit.");
  return (data?.wishlist ?? []) as string[];
}

// ===== Alamat =====

export type AddressInput = Omit<SavedAddress, "id">;

export async function fetchAddresses(): Promise<SavedAddress[]> {
  const res = await fetch("/api/user/addresses", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memuat alamat.");
  return (data?.addresses ?? []) as SavedAddress[];
}

export async function createAddress(input: AddressInput): Promise<SavedAddress[]> {
  const res = await fetch("/api/user/addresses", {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan alamat.");
  return (data?.addresses ?? []) as SavedAddress[];
}

export async function updateAddress(
  id: string,
  patch: Partial<AddressInput>,
): Promise<SavedAddress[]> {
  const res = await fetch(`/api/user/addresses?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memperbarui alamat.");
  return (data?.addresses ?? []) as SavedAddress[];
}

export async function deleteAddress(id: string): Promise<SavedAddress[]> {
  const res = await fetch(`/api/user/addresses?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal menghapus alamat.");
  return (data?.addresses ?? []) as SavedAddress[];
}

// ===== Profil =====

export async function updateDisplayName(
  displayName: string,
): Promise<void> {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memperbarui profil.");
}
