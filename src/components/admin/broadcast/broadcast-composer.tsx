"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Eye, Loader2, Send, SendHorizonal } from "lucide-react";
import {
  fetchBroadcastOverview,
  sendBroadcastRequest,
  sendTestBroadcastRequest,
  type SegmentCounts,
} from "@/lib/admin-broadcast-api";
import {
  BROADCAST_SEGMENT_LABEL,
  BROADCAST_SEGMENTS,
  type BroadcastSegment,
} from "@/lib/newsletter-types";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Bangun HTML pratinjau (murni tampilan, aman — teks di-escape). */
function previewHtml(params: {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const paras = params.body
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.65">${esc(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
  const cta =
    params.ctaUrl && params.ctaLabel
      ? `<div style="margin-top:20px"><span style="display:inline-block;background:#004EDF;color:#fff;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">${esc(params.ctaLabel)}</span></div>`
      : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#fff;font-size:19px">${esc(params.subject || "Subjek email")}</h1>
      </div>
      <div style="padding:24px">${paras || '<p style="color:#94a3b8;font-size:14px">Isi email akan tampil di sini…</p>'}${cta}</div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        LKTech · Berhenti berlangganan.
      </div>
    </div>
  </div>`;
}

/** Komposer broadcast (F-N5): estimasi penerima, pratinjau, kirim uji, kirim. */
export function BroadcastComposer() {
  const toast = useToast();
  const [counts, setCounts] = useState<SegmentCounts | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<BroadcastSegment>("semua");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const loadCounts = () => {
    fetchBroadcastOverview()
      .then((o) => setCounts(o.segmentCounts))
      .catch(() => {});
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const budget = () => {
    setError(null);
    if (subject.trim().length < 3) {
      setError("Subjek minimal 3 karakter.");
      return false;
    }
    if (body.trim().length < 3) {
      setError("Isi minimal 3 karakter.");
      return false;
    }
    if (ctaUrl.trim() && !ctaLabel.trim()) {
      setError("Isi juga label tombol bila memakai URL tombol.");
      return false;
    }
    if (ctaLabel.trim() && !ctaUrl.trim()) {
      setError("Isi juga URL tombol bila memakai label tombol.");
      return false;
    }
    return true;
  };

  const payload = () => ({
    subject: subject.trim(),
    body: body.trim(),
    segment,
    ctaLabel: ctaLabel.trim() || undefined,
    ctaUrl: ctaUrl.trim() || undefined,
  });

  const onSendTest = async () => {
    if (!budget() || testing) return;
    setTesting(true);
    try {
      const res = await sendTestBroadcastRequest({
        ...payload(),
        testEmail: testEmail.trim() || undefined,
      });
      toast.success(`Email uji terkirim ke ${res.to}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim email uji.";
      setError(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const onSend = async () => {
    if (!budget()) return;
    setConfirm(true);
  };

  const doSend = async () => {
    setSending(true);
    try {
      const res = await sendBroadcastRequest(payload());
      toast.success(
        `Terkirim: ${res.sent}${res.failed ? ` · gagal ${res.failed}` : ""}` +
          (res.truncated ? " · dibatasi per-batch" : "") +
          ".",
      );
      setSubject("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      setConfirm(false);
      loadCounts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const recipientsForSegment = counts ? counts[segment] : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="rounded-3xl border border-slate-200 bg-white p-6"
    >
      <h2 className="text-sm font-bold text-secondary">Kirim Broadcast</h2>
      <p className="mt-0.5 text-xs text-muted">
        Kirim promo/konten ke pelanggan. Email yang berhenti berlangganan otomatis
        dikecualikan.
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
              {BROADCAST_SEGMENTS.map((k) => (
                <option key={k} value={k}>
                  {BROADCAST_SEGMENT_LABEL[k]}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-muted">
              {recipientsForSegment === null
                ? "Menghitung penerima…"
                : `≈ ${recipientsForSegment} penerima pada segmen ini.`}
            </span>
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

        {/* Kirim uji */}
        <label className="flex flex-col gap-1.5 sm:max-w-xs">
          <span className="text-xs font-medium text-slate-600">
            Email uji (opsional — kosong = email Anda)
          </span>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="nama@email.com"
            className={field}
          />
        </label>

        {showPreview && (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div
              // Pratinjau dari teks yang kita-escape sendiri (bukan input mentah).
              dangerouslySetInnerHTML={{
                __html: previewHtml({ subject, body, ctaLabel, ctaUrl }),
              }}
            />
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? "Sembunyikan pratinjau" : "Pratinjau"}
          </button>
          <button
            type="button"
            onClick={onSendTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-50 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100 disabled:opacity-60"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
            Kirim uji
          </button>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim Broadcast
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={`Kirim broadcast ke "${BROADCAST_SEGMENT_LABEL[segment]}"?`}
        description={
          recipientsForSegment !== null
            ? `Email akan dikirim ke ± ${recipientsForSegment} pelanggan. Tindakan ini tidak dapat dibatalkan.`
            : "Email akan dikirim ke pelanggan pada segmen terpilih."
        }
        confirmLabel="Ya, kirim"
        busy={sending}
        tone="default"
        onConfirm={doSend}
        onCancel={() => setConfirm(false)}
      />
    </form>
  );
}
