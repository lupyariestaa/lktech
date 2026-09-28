import { getIdToken } from "@/lib/auth";
import type { StoredLead, LeadStatus } from "@/lib/lead-types";
import type { MediaItem } from "@/lib/media-types";

async function authHeaders() {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle<T>(res: Response): Promise<T> {
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

export async function fetchLeads(): Promise<StoredLead[]> {
  const res = await fetch("/api/admin/leads", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ leads: StoredLead[] }>(res);
  return data.leads;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const res = await fetch("/api/admin/leads", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ id, status }),
  });
  return handle<{ ok: boolean }>(res);
}

export async function deleteLead(id: string) {
  const res = await fetch(`/api/admin/leads?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return handle<{ ok: boolean }>(res);
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const res = await fetch("/api/admin/media", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ items: MediaItem[] }>(res);
  return data.items;
}

export async function saveMedia(
  item: Omit<MediaItem, "id" | "createdAt">,
) {
  const res = await fetch("/api/admin/media", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(item),
  });
  return handle<{ ok: boolean; id: string }>(res);
}

export async function deleteMedia(id: string, publicId: string) {
  const res = await fetch(
    `/api/admin/media?id=${encodeURIComponent(id)}&publicId=${encodeURIComponent(publicId)}`,
    { method: "DELETE", headers: await authHeaders() },
  );
  return handle<{ ok: boolean }>(res);
}
