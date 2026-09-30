"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { LEAD_SERVICES, leadSchema, type LeadInput } from "@/lib/lead-schema";
import { submitLead } from "@/lib/leads";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "saved" | "fallback" | "error";

const fieldBase =
  "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "Pembuatan Website",
      message: "",
      website: "",
    },
  });

  const onSubmit = async (values: LeadInput) => {
    setStatus("submitting");
    setFallbackUrl(null);
    try {
      const result = await submitLead(values);
      if (result.status === "saved") {
        setStatus("saved");
      } else if (result.status === "fallback") {
        setFallbackUrl(result.whatsappUrl);
        setStatus("fallback");
      }
      reset();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <AnimatePresence mode="wait">
        {status === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-secondary">
              Pesan berhasil terkirim!
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Terima kasih. Tim LKTech akan menghubungi Anda melalui email atau
              WhatsApp secepatnya.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-6 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              Kirim pesan lain
            </button>
          </motion.div>
        )}

        {status === "fallback" && (
          <motion.div
            key="fallback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-500">
              <MessageCircle className="h-8 w-8" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-secondary">
              Lanjutkan via WhatsApp
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Terima kasih! Untuk memastikan pesan Anda langsung sampai, silakan
              lanjutkan ke WhatsApp — pesan Anda sudah otomatis terisi.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {fallbackUrl && (
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
                >
                  <MessageCircle className="h-4 w-4" />
                  Buka WhatsApp
                </a>
              )}
              <button
                onClick={() => setStatus("idle")}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                Kembali ke form
              </button>
            </div>
          </motion.div>
        )}

        {(status === "idle" || status === "submitting" || status === "error") && (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nama lengkap" error={errors.name?.message}>
                <input
                  type="text"
                  placeholder="Nama Anda"
                  autoComplete="name"
                  className={cn(
                    fieldBase,
                    errors.name ? "border-rose-300" : "border-slate-200",
                  )}
                  {...register("name")}
                />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  className={cn(
                    fieldBase,
                    errors.email ? "border-rose-300" : "border-slate-200",
                  )}
                  {...register("email")}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nomor WhatsApp" error={errors.phone?.message}>
                <input
                  type="tel"
                  placeholder="0812xxxxxxx"
                  autoComplete="tel"
                  className={cn(
                    fieldBase,
                    errors.phone ? "border-rose-300" : "border-slate-200",
                  )}
                  {...register("phone")}
                />
              </Field>

              <Field label="Layanan yang diminati" error={errors.service?.message}>
                <select
                  className={cn(
                    fieldBase,
                    "appearance-none",
                    errors.service ? "border-rose-300" : "border-slate-200",
                  )}
                  {...register("service")}
                >
                  {LEAD_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Pesan" error={errors.message?.message}>
              <textarea
                rows={5}
                placeholder="Ceritakan kebutuhan atau ide proyek Anda..."
                className={cn(
                  fieldBase,
                  "resize-none",
                  errors.message ? "border-rose-300" : "border-slate-200",
                )}
                {...register("message")}
              />
            </Field>

            {/* Honeypot anti-bot: tersembunyi dari pengguna & screen reader. */}
            <div className="hidden" aria-hidden="true">
              <label>
                Jangan diisi
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register("website")}
                />
              </label>
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Terjadi kesalahan saat mengirim. Silakan coba lagi atau hubungi
                kami langsung via WhatsApp.
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Kirim Pesan
                </>
              )}
            </button>

            <p className="text-xs leading-relaxed text-muted">
              Dengan mengirim form ini, Anda setuju kami menghubungi Anda terkait
              kebutuhan proyek. Data Anda aman dan tidak dibagikan ke pihak lain.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">{label}</span>
      {children}
      {error && (
        <span className="flex items-center gap-1 text-xs text-rose-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </label>
  );
}
