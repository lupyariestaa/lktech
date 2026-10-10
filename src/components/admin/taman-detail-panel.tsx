"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { patchTaman, deleteTaman, type TamanAdminItem } from "@/lib/admin-api";
import type { AnimalKey, AnimalVariant } from "@/lib/taman-types";
import { canPublish } from "@/lib/taman-logic";
import { AnimalPicker } from "@/components/taman/taman-animal-picker";

const field =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * Panel detail testimoni taman (T6): isi, hewan, urutan, persetujuan & bukti,
 * serta aksi terbit/sembunyikan/tolak/hapus. Gate publish juga dijaga server (T5).
 */
export function TamanDetailPanel({
  item,
  onClose,
  onSaved,
}: {
  item: TamanAdminItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState({
    displayName: item.displayName,
    fullName: item.fullName ?? "",
    role: item.role,
    quote: item.quote,
    rating: item.rating,
    dateISO: item.dateISO.slice(0, 10),
    animal: item.animal,
    variant: item.variant,
    order: item.order,
    projectSlug: item.projectSlug ?? "",
    productSlug: item.productSlug ?? "",
  });
  const [consentGiven, setConsentGiven] = useState(item.consent.given);
  const [evidence, setEvidence] = useState(item.evidenceNote ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const gate = canPublish(
    { kind: item.kind, consent: { given: consentGiven } },
    evidence,
  );
  const isSample = item.kind === "sample";

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(
      () =>
        patchTaman(item.id, {
          displayName: draft.displayName,
          fullName: draft.fullName,
          role: draft.role,
          quote: draft.quote,
          rating: draft.rating,
          dateISO: draft.dateISO,
          animal: draft.animal,
          variant: draft.variant,
          order: draft.order,
          projectSlug: draft.projectSlug,
          productSlug: draft.productSlug,
          consentGiven: consentGiven && !item.consent.given ? true : undefined,
          evidenceNote: evidence !== (item.evidenceNote ?? "") ? evidence : undefined,
        }),
      "Perubahan disimpan.",
    );

  const setStatus = (status: "published" | "hidden" | "rejected") =>
    run(
      () =>
        patchTaman(item.id, {
          status,
          consentGiven: consentGiven && !item.consent.given ? true : undefined,
          evidenceNote: evidence !== (item.evidenceNote ?? "") ? evidence : undefined,
        }),
      status === "published" ? "Testimoni diterbitkan." : status === "hidden" ? "Testimoni disembunyikan." : "Testimoni ditolak.",
    );

  return (
    <div className="fixed inset-0 z-[12000] flex justify-end" role="dialog" aria-modal="true" aria-label="Detail testimoni">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-primary">{isSample ? "CONTOH (fiktif) · hanya pratinjau" : "Testimoni"}</p>
            <h2 className="text-sm font-bold text-secondary">{item.displayName}</h2>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* Data privat (admin saja) */}
          {!isSample && (
            <section className="rounded-2xl border border-slate-200 bg-surface p-4 text-xs text-slate-600">
              <p><span className="font-semibold">Email:</span> {item.email ?? "—"}</p>
              <p><span className="font-semibold">Nama lengkap:</span> {item.fullName ?? "—"}</p>
              <p><span className="font-semibold">Sumber:</span> {item.source}</p>
              {item.consentText && <p className="mt-2 italic">&ldquo;{item.consentText}&rdquo;</p>}
            </section>
          )}

          {/* Persetujuan & bukti */}
          <section aria-labelledby="consent-h" className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <h3 id="consent-h" className="text-sm font-bold text-secondary">Persetujuan pemberi</h3>
            <label className="flex items-center gap-2 text-xs text-secondary">
              <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} />
              Persetujuan penampilan publik sudah saya terima
            </label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={2}
              placeholder="Bukti persetujuan (mis. tautan/tanggal email atau chat)"
              className={field}
              aria-label="Catatan bukti persetujuan"
            />
            {!gate.ok && !isSample && (
              <p className="text-xs text-amber-700">{gate.reason}</p>
            )}
          </section>

          {/* Isi */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-secondary">Isi testimoni</h3>
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Nama tampil (disingkat)
              <input className={field} value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Nama lengkap (privat)
              <input className={field} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Peran / usaha
              <input className={field} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Pesan
              <textarea rows={4} className={field} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
              <span className="text-[11px] font-normal text-muted">{draft.quote.length}/400</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
                Rating
                <select className={field} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} bintang</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
                Tanggal
                <input type="date" className={field} value={draft.dateISO} onChange={(e) => setDraft({ ...draft, dateISO: e.target.value })} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Urutan (angka kecil tampil lebih dulu)
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDraft({ ...draft, order: Math.max(0, draft.order - 1) })} className="h-9 w-9 rounded-full border border-slate-200" aria-label="Naikkan">▲</button>
                <span className="w-12 text-center tabular-nums">{draft.order}</span>
                <button type="button" onClick={() => setDraft({ ...draft, order: draft.order + 1 })} className="h-9 w-9 rounded-full border border-slate-200" aria-label="Turunkan">▼</button>
              </div>
            </label>
          </section>

          {/* Hewan & warna */}
          <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-surface p-4">
            <AnimalPicker
              animal={draft.animal as AnimalKey}
              variant={draft.variant as AnimalVariant}
              onAnimal={(a) => setDraft((d) => ({ ...d, animal: a, variant: "normal" }))}
              onVariant={(v) => setDraft((d) => ({ ...d, variant: v }))}
            />
          </section>

          {/* Tautan opsional */}
          <section className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Slug proyek (opsional)
              <input className={field} value={draft.projectSlug} onChange={(e) => setDraft({ ...draft, projectSlug: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-secondary">
              Slug produk (opsional)
              <input className={field} value={draft.productSlug} onChange={(e) => setDraft({ ...draft, productSlug: e.target.value })} />
            </label>
          </section>
        </div>

        <div className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-secondary disabled:opacity-60">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Simpan
          </button>
          {item.status !== "published" && (
            <button
              onClick={() => setStatus("published")}
              disabled={busy || (!isSample && !gate.ok)}
              title={!isSample && !gate.ok ? gate.reason : undefined}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Terbitkan
            </button>
          )}
          {item.status === "published" && (
            <button onClick={() => setStatus("hidden")} disabled={busy} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-secondary disabled:opacity-60">
              Sembunyikan
            </button>
          )}
          {item.status !== "rejected" && (
            <button onClick={() => setStatus("rejected")} disabled={busy} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 disabled:opacity-60">
              Tolak
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)} disabled={busy} className="ml-auto rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 disabled:opacity-60">
            Hapus
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus testimoni ini?"
        description="Testimoni dan data privatnya (email) dihapus permanen."
        confirmLabel="Hapus"
        busy={busy}
        onConfirm={() =>
          run(async () => {
            await deleteTaman(item.id);
            setConfirmDelete(false);
            onClose();
          }, "Testimoni dihapus.")
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
