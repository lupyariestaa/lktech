import { adminFetch } from "@/lib/admin-fetch";
import { csvCell } from "@/lib/csv";
import type {
  AdminUserRow,
  AdminUsersSummary,
  UserProfile,
} from "@/lib/user-types";
import type { Order } from "@/lib/order-types";
import { formatDateTime, formatRupiah } from "@/lib/format";

/** Filter status pesanan pada daftar user. */
export type UsersFilter = "semua" | "sudah" | "belum";

export type UsersListQuery = {
  q?: string;
  filter?: UsersFilter;
  limit?: number;
  cursor?: string;
};

export type UsersListPage = {
  users: AdminUserRow[];
  nextCursor: string | null;
  truncated: boolean;
};

function buildQuery(query: UsersListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.filter && query.filter !== "semua") params.set("filter", query.filter);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Daftar user (admin). */
export async function fetchUsers(
  query: UsersListQuery = {},
): Promise<UsersListPage> {
  return adminFetch<UsersListPage>(
    `/api/admin/users${buildQuery(query)}`,
  );
}

/** Ringkasan statistik user. */
export async function fetchUsersSummary(): Promise<AdminUsersSummary> {
  const data = await adminFetch<{ summary: AdminUsersSummary }>(
    "/api/admin/users?summary=1",
  );
  return data.summary;
}

export type UsersExport = {
  users: AdminUserRow[];
  /** `true` bila hasil dipotong batas keras / batas pencarian. */
  truncated: boolean;
  /** Batas keras baris yang dipakai server. */
  cap: number;
};

/**
 * Ekspor seluruh hasil filter (server-side, OWNER-only) hingga batas keras.
 * Berbeda dari `fetchUsers` yang hanya satu halaman.
 */
export async function fetchUsersForExport(
  query: Pick<UsersListQuery, "q" | "filter"> = {},
): Promise<UsersExport> {
  const params = new URLSearchParams({ export: "1" });
  if (query.q) params.set("q", query.q);
  if (query.filter && query.filter !== "semua") {
    params.set("filter", query.filter);
  }
  return adminFetch<UsersExport>(`/api/admin/users?${params.toString()}`);
}

/** Detail user + daftar pesanannya. */
export async function fetchUserDetail(
  uid: string,
): Promise<{ user: UserProfile; orders: Order[] }> {
  return adminFetch<{ user: UserProfile; orders: Order[] }>(
    `/api/admin/users/${encodeURIComponent(uid)}`,
  );
}

/** Blokir / buka blokir user. */
export async function setUserBlocked(
  id: string,
  blocked: boolean,
): Promise<void> {
  await adminFetch<{ ok: boolean }>("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({ id, blocked }),
  });
}

/** Ekspor daftar user ke CSV (menghormati urutan yang sedang tampil). */
export function exportUsersToCsv(users: AdminUserRow[], filename?: string) {
  const headers = [
    "Nama",
    "Email",
    "WhatsApp",
    "Total Pesanan",
    "Pesanan Dibayar",
    "Total Belanja (dibayar)",
    "Status Pembayaran",
    "Diblokir",
    "Terdaftar",
    "Login Terakhir",
  ];

  const rows = users.map((u) =>
    [
      u.displayName,
      u.email,
      u.whatsapp,
      u.orderCount,
      u.paidOrderCount,
      u.totalSpent,
      u.hasOrders ? "Sudah bayar" : "Belum bayar",
      u.blocked ? "Ya" : "Tidak",
      u.createdAt,
      u.lastLoginAt,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = "\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `pengguna-lktech-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Label ramah untuk tampilan (dipakai komponen). */
export function userSpentLabel(u: AdminUserRow): string {
  return u.totalSpent > 0 ? formatRupiah(u.totalSpent) : "—";
}

export function userDateLabel(iso: string): string {
  return iso ? formatDateTime(iso) : "—";
}
