"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAsyncList } from "@/components/admin/use-async-list";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { TamanDetailPanel } from "@/components/admin/taman-detail-panel";
import {
  bulkTaman,
  deleteTamanSamples,
  fetchTaman,
  patchTaman,
  seedTamanSamples,
  importLegacyTaman,
  type TamanAdminItem,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TamanAdminItem["status"], string> = {
  pending: "Menunggu",
  published: "Tampil",
  hidden: "Disembunyikan",
  rejected: "Ditolak",
};
const STATUS_TONE: Record<TamanAdminItem["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  hidden: "bg-slate-100 text-slate-600",
  rejected: "bg-rose-50 text-rose-600",
};

const BULK_MAX = 50;

/**
 * Halaman Taman Testimoni (T6): daftar, filter, urutan, pilih banyak, dan detail.
 * Semua aturan (gate publish, batas bulk, sample hanya lokal) dijaga server.
 */
export function TamanManager() {
  const toast = useToast();
  const { data: items, loading, reload } = useAsyncList<TamanAdminItem>(fetchTaman, "Gagal memuat testimoni.");
  const [statusFilter, setStatusFilter] = useState<TamanAdminItem["status"] | "semua">("semua");
  const [kindFilter, setKindFilter] = useState<"semua" | "real" | "sample">("semua");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<TamanAdminItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<"publish" | "hide" | "delete" | null>(null);
  const [confirmSamples, setConfirmSamples] = useState(false);

  const counts = useMemo(() => {
    const real = items.filter((i) => i.kind === "real");
    return {
      pending: real.filter((i) => i.status === "pending").length,
      published: real.filter((i) => i.status === "published").length,
      hidden: real.filter((i) => i.status === "hidden").length,
      samples: items.filter((i) => i.kind === "sample").length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => statusFilter === "semua" || i.status === statusFilter)
      .filter((i) => kindFilter === "semua" || i.kind === kindFilter)
      .filter((i) => !q || `${i.displayName} ${i.fullName ?? ""} ${i.quote} ${i.role}`.toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order);
  }, [items, statusFilter, kindFilter, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < BULK_MAX) next.add(id);
      return next;
    });

  /** Geser urutan: tukar nilai `order` dengan tetangga (▲▼ keyboard-friendly). */
  const move = async (item: TamanAdminItem, dir: -1 | 1) => {
    const idx = visible.findIndex((i) => i.id === item.id);
    const neighbour = visible[idx + dir];
    if (!neighbour) return;
    setBusy(true);
    try {
      await Promise.all([
        patchTaman(item.id, { order: neighbour.order }),
        patchTaman(neighbour.id, { order: item.order }),
      ]);
      await reload({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah urutan.");
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async () => {
    if (!confirmBulk) return;
    setBusy(true);
    try {
      const res = await bulkTaman(confirmBulk, Array.from(selected));
      if (res.failed > 0) toast.error(`${res.done} berhasil, ${res.failed} gagal (lihat alasan di daftar).`);
      else toast.success(`${res.done} testimoni diproses.`);
      setSelected(new Set());
      await reload({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Aksi massal gagal.");
    } finally {
      setBusy(false);
      setConfirmBulk(null);
    }
  };

  /** Impor testimoni lama: pratinjau dulu (dry run), lalu konfirmasi. */
  const importLegacy = async () => {
    setBusy(true);
    try {
      const preview = await importLegacyTaman(true);
      if ((preview.drafts ?? 0) === 0) {
        toast.success("Tidak ada testimoni lama yang perlu diimpor.");
        return;
      }
      const ok = window.confirm(
        `${preview.drafts} testimoni lama akan diimpor sebagai draft (menunggu persetujuan). ${preview.skipped.length} dilewati. Lanjutkan?`,
      );
      if (!ok) return;
      const res = await importLegacyTaman(false);
      toast.success(`${res.imported ?? 0} testimoni lama diimpor sebagai draft.`);
      await reload({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengimpor.");
    } finally {
      setBusy(false);
    }
  };

  const samples = async (action: "seed" | "clear") => {
    setBusy(true);
    try {
      if (action === "seed") {
        const r = await seedTamanSamples();
        toast.success(`${r.created} contoh dibuat (hanya lokal).`);
      } else {
        const r = await deleteTamanSamples();
        toast.success(`${r.deleted} contoh dihapus.`);
      }
      await reload({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses contoh.");
    } finally {
      setBusy(false);
      setConfirmSamples(false);
    }
  };

  const chip = (active: boolean) =>
    cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", active ? "bg-primary text-white" : "border border-slate-200 text-slate-600 hover:border-primary/40");

  return (
    <div className="flex flex-col gap-5">
      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Menunggu", value: counts.pending },
          { label: "Tampil", value: counts.published },
          { label: "Disembunyikan", value: counts.hidden },
          { label: "Contoh (lokal)", value: counts.samples },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-secondary tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Aksi utama */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/taman/pratinjau" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-secondary hover:border-primary/40">
          <Eye className="h-3.5 w-3.5" /> Pratinjau frame
        </Link>
        <button onClick={importLegacy} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary disabled:opacity-60">
          Impor testimoni lama
        </button>
        <button onClick={() => reload()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-secondary disabled:opacity-60">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Muat ulang
        </button>
        {process.env.NODE_ENV === "development" && (
          <>
            <button onClick={() => samples("seed")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-400 px-4 py-2 text-xs font-semibold text-amber-700 disabled:opacity-60">
              <Plus className="h-3.5 w-3.5" /> Buat contoh (lokal)
            </button>
            <button onClick={() => setConfirmSamples(true)} disabled={busy || counts.samples === 0} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" /> Hapus contoh
            </button>
          </>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, peran, atau pesan..."
          aria-label="Cari testimoni"
          className="min-w-[200px] flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm"
        />
        {(["semua", "pending", "published", "hidden", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s} className={chip(statusFilter === s)}>
            {s === "semua" ? "Semua" : STATUS_LABEL[s]}
          </button>
        ))}
        {(["semua", "real", "sample"] as const).map((k) => (
          <button key={k} onClick={() => setKindFilter(k)} aria-pressed={kindFilter === k} className={chip(kindFilter === k)}>
            {k === "semua" ? "Semua jenis" : k === "real" ? "Asli" : "Contoh"}
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-primary">{selected.size} dipilih (maks {BULK_MAX})</span>
          <button onClick={() => setConfirmBulk("publish")} disabled={busy} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Terbitkan</button>
          <button onClick={() => setConfirmBulk("hide")} disabled={busy} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60">Sembunyikan</button>
          <button onClick={() => setConfirmBulk("delete")} disabled={busy} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60">Hapus</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs font-semibold text-slate-500">Batal pilih</button>
        </div>
      )}

      {/* Daftar */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Memuat...</div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-14 text-center text-sm text-muted">Belum ada testimoni yang cocok.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Daftar testimoni">
          {visible.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Pilih ${t.displayName}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/taman/animals/${t.animal}.svg`} alt="" width={36} height={36} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-secondary">{t.displayName}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[t.status])}>{STATUS_LABEL[t.status]}</span>
                  {t.kind === "sample" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">CONTOH</span>}
                  <span className="text-[11px] text-muted">{"★".repeat(t.rating)}</span>
                </div>
                <p className="truncate text-xs text-muted">{t.quote}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(t, -1)} disabled={busy || i === 0} aria-label="Naikkan urutan" className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 disabled:opacity-30">▲</button>
                <span className="w-8 text-center text-xs tabular-nums text-muted">{t.order}</span>
                <button onClick={() => move(t, 1)} disabled={busy || i === visible.length - 1} aria-label="Turunkan urutan" className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 disabled:opacity-30">▼</button>
              </div>
              <button onClick={() => setOpen(t)} className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-secondary hover:border-primary/40">Detail</button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <TamanDetailPanel
          item={open}
          onClose={() => setOpen(null)}
          onSaved={async () => {
            await reload({ silent: true });
            setOpen(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmBulk !== null}
        title="Konfirmasi aksi massal"
        description={
          confirmBulk === "delete"
            ? `${selected.size} testimoni beserta data privatnya akan dihapus permanen.`
            : confirmBulk === "publish"
              ? `${selected.size} testimoni akan diterbitkan. Testimoni asli tanpa persetujuan & bukti akan ditolak server.`
              : `${selected.size} testimoni akan disembunyikan dari publik.`
        }
        confirmLabel="Lanjutkan"
        busy={busy}
        onConfirm={runBulk}
        onCancel={() => setConfirmBulk(null)}
      />

      <ConfirmDialog
        open={confirmSamples}
        title="Hapus semua contoh?"
        description="Semua testimoni berjenis contoh akan dihapus. Testimoni asli tidak terpengaruh."
        confirmLabel="Hapus contoh"
        busy={busy}
        onConfirm={() => samples("clear")}
        onCancel={() => setConfirmSamples(false)}
      />
    </div>
  );
}
