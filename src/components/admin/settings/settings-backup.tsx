"use client";

import { useState } from "react";
import { AlertTriangle, Check, Download, Loader2, Upload } from "lucide-react";
import {
  BACKUP_SOURCES,
  BACKUP_SOURCE_LABEL,
  summarizeBackup,
  validateBackupBundle,
  type BackupSource,
} from "@/lib/backup-pure";
import { adminFetch, ApiError } from "@/lib/admin-fetch";
import { ensureRecentAdminAuth } from "@/lib/admin-reauth";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

type DryRun = {
  total: number;
  willWrite: number;
  skipped: number;
  truncated: boolean;
  perSource: Array<{ source: BackupSource; total: number; accepted: number; skipped: number }>;
};

/** Halaman Backup & Restore (fase S7). */
export function SettingsBackup() {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<BackupSource>>(new Set(BACKUP_SOURCES));
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<{ name: string; json: unknown; summary: Array<{ source: BackupSource; count: number }> } | null>(null);
  const [dryRun, setDryRun] = useState<DryRun | null>(null);
  // G29: dialog konfirmasi dipisah dari panel pratinjau (tak tampil bersamaan).
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggle = (s: BackupSource) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  const toggleAll = () => setSelected(new Set(selected.size === BACKUP_SOURCES.length ? [] : BACKUP_SOURCES));

  const onExport = async () => {
    if (selected.size === 0) {
      toast.error("Pilih minimal satu sumber data.");
      return;
    }
    setExporting(true);
    try {
      await ensureRecentAdminAuth();
      const list = [...selected].join(",");
      const res = await fetch(`/api/admin/backup?sources=${encodeURIComponent(list)}`, {
        headers: await (await import("@/lib/admin-fetch")).authHeaders(),
      });
      if (!res.ok) throw new Error("Gagal membuat backup.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lktech-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup diunduh.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat backup.");
    } finally {
      setExporting(false);
    }
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const v = validateBackupBundle(json);
      if (!v.ok) {
        toast.error(v.error);
        return;
      }
      setPending({ name: file.name, json, summary: summarizeBackup(v.bundle) });
      // Dry-run (G4): pratinjau dampak tanpa menulis apa pun.
      setDryRun(null);
      try {
        const res = await adminFetch<DryRun & { dryRun: true }>(
          "/api/admin/backup?dryRun=1",
          { method: "POST", body: JSON.stringify(json) },
        );
        setDryRun(res);
      } catch (err) {
        // Kebijakan OWNER untuk sumber admins bukan kegagalan pratinjau biasa:
        // hentikan di sini agar admin tidak lanjut ke tombol Pulihkan.
        if (err instanceof ApiError && err.status === 403) {
          toast.error(err.message);
          setPending(null);
          return;
        }
        /* pratinjau opsional — jangan blokir bila gagal */
      }
    } catch {
      toast.error("File bukan JSON yang valid.");
    }
  };

  const closePending = () => {
    setPending(null);
    setDryRun(null);
    setConfirmOpen(false);
  };

  const doImport = async () => {
    if (!pending) return;
    setImporting(true);
    try {
      await ensureRecentAdminAuth();
      const res = await adminFetch<{
        ok: boolean;
        written: number;
        failed: number;
        skipped: number;
        truncated: boolean;
      }>("/api/admin/backup", { method: "POST", body: JSON.stringify(pending.json) });
      const notes = [
        res.skipped ? `${res.skipped} dilewati` : "",
        res.truncated ? "dipotong (melebihi batas)" : "",
      ].filter(Boolean);
      toast.success(
        `Dipulihkan: ${res.written} dokumen${res.failed ? `, ${res.failed} gagal` : ""}${
          notes.length ? ` — ${notes.join(", ")}` : ""
        }.`,
      );
      closePending();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Ekspor */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <Download className="h-4 w-4" /> Ekspor Backup
        </h2>
        <p className="mt-1 text-xs text-muted">Pilih data yang ingin di-backup, lalu unduh sebagai file JSON.</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {selected.size === BACKUP_SOURCES.length ? "Kosongkan semua" : "Pilih semua"}
          </button>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BACKUP_SOURCES.map((s) => (
              <label
                key={s}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                  selected.has(s) ? "border-primary/30 bg-primary-50/50" : "border-slate-200 bg-white",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s)}
                  onChange={() => toggle(s)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                <span className="text-secondary">{BACKUP_SOURCE_LABEL[s]}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Unduh Backup ({selected.size} sumber)
        </button>
      </section>

      {/* Impor */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <Upload className="h-4 w-4" /> Pulihkan (Impor)
        </h2>
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Impor menimpa/menggabungkan dokumen dengan id yang sama. Pastikan file berasal dari
            sumber tepercaya. Tindakan dicatat di audit log. Sumber “Daftar admin” hanya dapat
            dipulihkan oleh OWNER.
          </span>
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary">
          <Upload className="h-4 w-4" />
          Pilih file backup (.json)
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {pending && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
            <Check className="h-4 w-4" aria-hidden="true" /> Pratinjau: {pending.name}
          </h2>
          {dryRun?.truncated && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Backup melebihi batas impor — sebagian dokumen akan diabaikan.</span>
            </div>
          )}
          <ul className="mt-3 flex flex-col gap-1.5 text-xs">
            {pending.summary.length === 0 ? (
              <li className="text-muted">Tidak ada data pada file ini.</li>
            ) : (
              pending.summary.map((s) => {
                const d = dryRun?.perSource.find((p) => p.source === s.source);
                return (
                  <li key={s.source} className="flex items-center justify-between">
                    <span className="text-muted">{BACKUP_SOURCE_LABEL[s.source]}</span>
                    <span className="font-semibold text-secondary">
                      {s.count} dokumen
                      {d && d.skipped > 0 ? (
                        <span className="ml-2 font-normal text-amber-600">({d.skipped} dilewati)</span>
                      ) : null}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
          {dryRun && (
            <p className="mt-3 text-[11px] text-muted">
              OWNER dilindungi & admin dipaksa aktif saat restore. Sumber “Daftar admin” hanya
              untuk OWNER. Snapshot otomatis dibuat sebelum penulisan (koleksi{" "}
              <code>_backup_snapshots</code>).
            </p>
          )}

          {/* Tahap 2: konfirmasi final (dialog) — tidak tampil bersamaan dgn panel. */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={pending.summary.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Pulihkan sekarang
            </button>
            <button
              type="button"
              onClick={closePending}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              Batal
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen && pending !== null}
        title="Pulihkan dari backup?"
        description={
          pending
            ? `File "${pending.name}" berisi ${pending.summary.reduce((n, s) => n + s.count, 0)} dokumen.${
                dryRun ? ` Akan ditulis ${dryRun.willWrite} dokumen${dryRun.skipped ? `, ${dryRun.skipped} dilewati` : ""}.` : ""
              } Lanjutkan?`
            : undefined
        }
        confirmLabel="Pulihkan"
        busy={importing}
        onConfirm={doImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
