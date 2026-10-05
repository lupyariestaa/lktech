"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Mail, Send, Users } from "lucide-react";
import {
  fetchSubscribersSummary,
  sendBroadcastRequest,
  type SubscribersSummary,
} from "@/lib/admin-broadcast-api";
import { BROADCAST_SEGMENT_LABEL, type BroadcastSegment } from "@/lib/newsletter-types";
import { useToast } from "@/components/admin/toast";
import { cn } from "@/lib/utils";

/** Kelola newsletter & kirim broadcast (Tema 2.2). */
export function BroadcastManager() {
  const toast = useToast();
  const [summary, setSummary] = useState<SubscribersSummary | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<BroadcastSegment>("semua");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await fetchSubscribersSummary();
        if (active) setSummary(s);
      } catch {
        /* silent */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!subject.trim() || !body.trim()) {
      setError("Subjek dan isi wajib diisi.");
      return;
    }
    if (!window.confirm(`Kirim broadcast ke segmen "${BROADCAST_SEGMENT_LABEL[segment]}"?`)) {
      return;
    }
    setSending(true);
    try {
      const res = await sendBroadcastRequest({
        subject: subject.trim(),
        body: body.trim(),
        segment,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
      });
      toast.success(`Terkirim: ${res.sent}${res.failed ? ` · gagal ${res.failed}` : ""}.`);
      setSubject("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Form broadcast */}
      <form onSubmit={onSend} className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Kirim Broadcast</h2>
        <p className="mt-0.5 text-xs text-muted">
          Kirim promo/konten ke pelanggan. Email yang berhenti berlangganan otomatis dikecualikan.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Subjek</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="Promo akhir bulan: diskon 20%!"
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Isi pesan</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              maxLength={8000}
              placeholder="Tulis isi email… (baris kosong = paragraf baru)"
              className={cn(field, "resize-none")}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">Segmen</span>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as BroadcastSegment)}
                className={field}
              >
                {(Object.keys(BROADCAST_SEGMENT_LABEL) as BroadcastSegment[]).map((k) => (
                  <option key={k} value={k}>
                    {BROADCAST_SEGMENT_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">Label tombol</span>
                <input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  maxLength={60}
                  placeholder="Lihat promo"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-600">URL tombol</span>
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://…"
                  className={field}
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim Broadcast
          </button>
        </div>
      </form>

      {/* Ringkasan */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-secondary">Pelanggan</h2>
          {summary ? (
            <dl className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <Users className="h-3.5 w-3.5" /> Total
                </dt>
                <dd className="text-sm font-bold text-secondary">{summary.total}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <Mail className="h-3.5 w-3.5" /> Aktif
                </dt>
                <dd className="text-sm font-bold text-emerald-600">{summary.active}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted">Berhenti</dt>
                <dd className="text-sm font-bold text-slate-500">{summary.unsubscribed}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-relaxed text-amber-800">
          <strong className="font-semibold">Catatan:</strong> bila domain Resend belum
          diverifikasi, email hanya terkirim ke alamat terdaftar di akun Resend.
          Verifikasi domain agar broadcast sampai ke semua pelanggan.
        </div>
      </aside>
    </div>
  );
}
