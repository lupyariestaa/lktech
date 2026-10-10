"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { getIdToken } from "@/lib/auth";

type MyTestimonial = {
  id: string;
  status: "pending" | "published" | "hidden" | "rejected";
  quote: string;
  rating: number;
  displayName: string;
  role: string;
  dateISO: string;
  createdAtISO: string;
};

const STATUS_LABEL: Record<MyTestimonial["status"], string> = {
  pending: "Menunggu tinjauan",
  published: "Tampil di situs",
  hidden: "Disembunyikan",
  rejected: "Tidak diterbitkan",
};

const STATUS_TONE: Record<MyTestimonial["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  hidden: "bg-slate-100 text-slate-600",
  rejected: "bg-rose-50 text-rose-600",
};

/**
 * Tab "Testimoni saya" (T8): status testimoni milik pengguna dan hak hapus (Q20).
 * Hanya data milik akun ini (server memfilter dari token).
 */
export function AccountTaman() {
  const [items, setItems] = useState<MyTestimonial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    // Seperti useAsyncList: setState hanya setelah await, dan diabaikan bila sudah unmount.
    let active = true;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/taman/mine", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Gagal memuat testimoni.");
        }
        const data = (await res.json()) as { items: MyTestimonial[] };
        if (active) {
          setItems(data.items);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat testimoni.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm("Hapus testimoni ini? Data Anda (termasuk email) ikut dihapus.")) return;
    setBusyId(id);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/taman/mine/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Gagal menghapus.");
      }
      setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusyId(null);
    }
  };

  if (items === null && !error) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" /> Memuat testimoni...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Testimoni yang pernah Anda kirim dan statusnya.</p>
        <Link href="/taman/tulis" className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-dark">
          Tulis testimoni
        </Link>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      {items && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-muted">
          Anda belum pernah menulis testimoni.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items?.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
              <span className="text-xs text-muted">{new Date(t.createdAtISO).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}</span>
            </div>
            <p className="text-sm text-slate-700">&ldquo;{t.quote}&rdquo;</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{"★".repeat(t.rating)} · {t.displayName}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                disabled={busyId === t.id}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:text-rose-500 disabled:opacity-60"
              >
                {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
