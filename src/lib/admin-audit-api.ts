import { adminFetch } from "@/lib/admin-fetch";
import type { AdminAuditEntry } from "@/lib/admin-audit-types";

/** Daftar audit log admin (opsional difilter). */
export async function fetchAdminAudit(query: {
  action?: string;
  actor?: string;
  q?: string;
  limit?: number;
} = {}): Promise<AdminAuditEntry[]> {
  const params = new URLSearchParams();
  if (query.action && query.action !== "semua") params.set("action", query.action);
  if (query.actor) params.set("actor", query.actor);
  if (query.q) params.set("q", query.q);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const data = await adminFetch<{ entries: AdminAuditEntry[] }>(
    `/api/admin/audit${qs ? `?${qs}` : ""}`,
  );
  return data.entries;
}
