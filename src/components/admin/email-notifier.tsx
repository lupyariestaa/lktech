"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { sendTestEmail } from "@/lib/admin-api";

/**
 * Panel untuk menguji notifikasi email lead.
 */
export function EmailNotifier() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onTest = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendTestEmail();
      setResult(`Email percobaan terkirim ke ${res.to}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-secondary">Notifikasi Email</h2>
      <p className="mt-1 text-xs text-muted">
        Kirim email otomatis ke Anda setiap ada lead baru dari form kontak.
        Diatur lewat env <code>RESEND_API_KEY</code> &amp;{" "}
        <code>LEAD_NOTIFY_EMAILS</code>.
      </p>

      <button
        onClick={onTest}
        disabled={busy}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Kirim Email Percobaan
      </button>

      {result && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {result}
        </p>
      )}
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
