"use client";

import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useSiteContent } from "@/components/admin/use-site-content";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import type { ManagedFaq } from "@/lib/content-types";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

export function FaqManager() {
  const { content, loading, saving, error, loadFailed, reject, reload, commit } =
    useSiteContent();
  // Draft lokal agar mengetik terasa mulus; disimpan saat tombol ditekan.
  const [draft, setDraft] = useState<ManagedFaq[] | null>(null);

  const list = draft ?? content.faqs;
  const dirty = draft !== null;
  useRegisterDirty(dirty);

  const addDraft = () => setDraft([...list, { question: "", answer: "" }]);

  const updateFaq = (i: number, patch: Partial<ManagedFaq>) =>
    setDraft(list.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const removeFaq = (i: number) =>
    setDraft(list.filter((_, j) => j !== i));

  const saveAll = async () => {
    if (!draft) return;
    const cleaned = draft.filter((f) => f.question.trim());
    if (cleaned.length === 0) {
      reject("Minimal satu FAQ harus memiliki pertanyaan.");
      return;
    }
    const ok = await commit(
      { faqs: cleaned },
      { successMessage: "FAQ berhasil disimpan." },
    );
    if (ok) setDraft(null);
  };

  const reloadAll = async () => {
    setDraft(null);
    await reload();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat FAQ…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{list.length} pertanyaan</p>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", saving && "animate-spin")} />
            Muat ulang
          </button>
          <button
            onClick={addDraft}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
          <button
            onClick={saveAll}
            disabled={!dirty || saving || loadFailed}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}
            {loadFailed && (
              <span className="mt-1 block text-xs text-rose-500">
                Klik &quot;Muat ulang&quot; sebelum menyimpan agar tidak menimpa
                data yang ada.
              </span>
            )}
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            Belum ada FAQ. Klik &quot;Tambah&quot; untuk mulai.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start gap-2">
                <input
                  value={faq.question}
                  onChange={(e) => updateFaq(i, { question: e.target.value })}
                  placeholder="Pertanyaan"
                  className={fieldBase}
                />
                <button
                  type="button"
                  onClick={() => removeFaq(i)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                rows={3}
                value={faq.answer}
                onChange={(e) => updateFaq(i, { answer: e.target.value })}
                placeholder="Jawaban"
                className={cn(fieldBase, "mt-2 resize-none")}
              />
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <p className="text-xs text-amber-600">
          Ada perubahan yang belum disimpan.
        </p>
      )}
    </div>
  );
}
