"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  CalendarClock,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Plus,
  Target,
  Ticket,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  createCoupon,
  updateCoupon,
  type CouponFormInput,
} from "@/lib/admin-coupons-api";
import {
  COUPON_AUDIENCE_LABEL,
  COUPON_TYPE_LABEL,
  type Coupon,
  type CouponType,
} from "@/lib/coupon-types";
import { validateCouponForm, type CouponFormErrors } from "@/lib/coupon-pure";
import { useToast } from "@/components/admin/toast";
import { isoToLocal, localToIso } from "@/components/admin/coupons/datetime";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type TierDraft = { minSpend: number; value: number; kind: "percent" | "amount" };

const EMPTY_FORM: CouponFormInput = {
  code: "",
  description: "",
  type: "percent",
  value: 10,
  tiers: undefined,
  minSpend: 0,
  appliesToSlugs: undefined,
  minItems: undefined,
  maxDiscount: undefined,
  startsAt: "",
  endsAt: "",
  usageLimit: undefined,
  limitPerUser: 1,
  singleUse: false,
  assignedEmail: "",
  audience: "semua",
  perDayLimit: undefined,
  campaign: "",
  stackable: false,
  active: true,
};

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const labelCls = "text-xs font-semibold text-secondary";

/** Section form ber-legend (fieldset) — pengelompokan visual. */
function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold text-secondary">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary-50 text-primary">
          {icon}
        </span>
        {title}
      </legend>
      {desc && <p className="mt-0.5 mb-3 text-[11px] text-muted">{desc}</p>}
      <div className={desc ? "" : "mt-3"}>{children}</div>
    </fieldset>
  );
}

/**
 * Halaman form buat/edit kupon (route khusus, bukan dialog).
 * Dipakai `/admin/coupons/new` & `/admin/coupons/[id]/edit`.
 */
export function CouponForm({
  coupon,
  onSaved,
  onCancel,
}: {
  coupon: Coupon | null;
  /** Dipanggil setelah sukses (default: kembali ke daftar kupon). */
  onSaved?: () => void;
  /** Dipanggil saat batal/kembali (default: kembali ke daftar kupon). */
  onCancel?: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const isEdit = Boolean(coupon);

  const goBack = () => {
    if (onCancel) onCancel();
    else router.push("/admin/coupons");
  };
  const afterSave = () => {
    if (onSaved) onSaved();
    else router.push("/admin/coupons");
  };

  const [form, setForm] = useState<CouponFormInput>(() =>
    coupon
      ? {
          code: coupon.code,
          description: coupon.description ?? "",
          type: coupon.type,
          value: coupon.value,
          tiers: coupon.tiers
            ? coupon.tiers.map((t) => ({
                minSpend: t.minSpend,
                value: t.value,
                kind: t.kind ?? "percent",
              }))
            : undefined,
          minSpend: coupon.minSpend,
          appliesToSlugs: coupon.appliesToSlugs,
          minItems: coupon.minItems,
          maxDiscount: coupon.maxDiscount,
          startsAt: isoToLocal(coupon.startsAt),
          endsAt: isoToLocal(coupon.endsAt),
          usageLimit: coupon.usageLimit,
          limitPerUser: coupon.limitPerUser,
          singleUse: coupon.singleUse ?? false,
          assignedEmail: coupon.assignedEmail ?? "",
          audience: coupon.audience ?? "semua",
          perDayLimit: coupon.perDayLimit,
          campaign: coupon.campaign ?? "",
          stackable: coupon.stackable ?? false,
          active: coupon.active,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CouponFormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof CouponFormInput>(k: K, v: CouponFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ---- Editor tier (tipe `tiered`) ---- */
  const tiers: TierDraft[] = (form.tiers as TierDraft[] | undefined) ?? [];
  const setTiers = (next: TierDraft[]) => set("tiers", next.length ? next : undefined);
  const addTier = () =>
    setTiers([
      ...tiers,
      { minSpend: (tiers.at(-1)?.minSpend ?? 0) + 100_000, value: 10, kind: "percent" },
    ]);
  const updateTier = (i: number, patch: Partial<TierDraft>) =>
    setTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeTier = (i: number) => setTiers(tiers.filter((_, idx) => idx !== i));

  const buildPayload = (): CouponFormInput => ({
    ...form,
    code: form.code.trim().toUpperCase(),
    startsAt: localToIso(form.startsAt),
    endsAt: localToIso(form.endsAt),
    appliesToSlugs:
      form.appliesToSlugs && form.appliesToSlugs.length ? form.appliesToSlugs : undefined,
    minItems:
      typeof form.minItems === "number" && form.minItems > 0 ? form.minItems : undefined,
    maxDiscount:
      form.type === "percent" && form.maxDiscount ? form.maxDiscount : undefined,
    tiers: form.type === "tiered" ? (form.tiers as CouponFormInput["tiers"]) : undefined,
    assignedEmail: form.assignedEmail?.trim() || undefined,
    campaign: form.campaign?.trim() || undefined,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = buildPayload();

    const validation = validateCouponForm({
      code: payload.code,
      type: payload.type,
      value: payload.value,
      tiers: payload.tiers,
      minSpend: payload.minSpend,
      maxDiscount: payload.maxDiscount,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      usageLimit: payload.usageLimit,
      limitPerUser: payload.limitPerUser,
      perDayLimit: payload.perDayLimit,
      assignedEmail: payload.assignedEmail,
    });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setError("Periksa kembali isian yang ditandai.");
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && coupon) {
        await updateCoupon(coupon.id, payload);
        toast.success("Kupon diperbarui.");
      } else {
        await createCoupon(payload);
        toast.success("Kupon dibuat.");
      }
      afterSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kupon.");
    } finally {
      setSaving(false);
    }
  };

  const fieldA11y = (name: keyof CouponFormErrors) =>
    fieldErrors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `coupon-${name}-error` }
      : {};
  const fieldBorder = (name: keyof CouponFormErrors) =>
    fieldErrors[name] ? " border-rose-300" : "";
  const renderFieldError = (name: keyof CouponFormErrors) =>
    fieldErrors[name] ? (
      <span id={`coupon-${name}-error`} role="alert" className="text-[11px] text-rose-500">
        {fieldErrors[name]}
      </span>
    ) : null;

  const valueText = useMemo(() => {
    if (form.type === "tiered") {
      return tiers.length ? `${tiers.length} tingkat` : "Belum ada tingkat";
    }
    return form.type === "percent" ? `${form.value}%` : formatRupiah(form.value);
  }, [form.type, form.value, tiers.length]);

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Header halaman */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
            <Ticket className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-secondary">
              {isEdit ? "Edit Kupon" : "Buat Kupon"}
            </h1>
            <p className="text-sm text-muted">
              {isEdit
                ? `Perbarui pengaturan kupon ${coupon?.code}.`
                : "Atur diskon, syarat, jadwal, dan penargetan kupon."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </button>
      </div>

      {/* Body: 2 kolom (form + pratinjau) */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Kolom form */}
        <div className="flex flex-col gap-4">
          <Section icon={<BadgePercent className="h-3.5 w-3.5" />} title="Dasar">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={labelCls}>Kode Kupon</span>
                <input
                  data-autofocus
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="PROMO10"
                  className={cn(field, "font-mono tracking-wide", fieldBorder("code"))}
                  {...fieldA11y("code")}
                />
                {renderFieldError("code")}
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={labelCls}>Deskripsi (opsional)</span>
                <input
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Diskon launching"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Kampanye (opsional)</span>
                <input
                  value={form.campaign ?? ""}
                  onChange={(e) => set("campaign", e.target.value)}
                  placeholder="mis. Ramadan 2026"
                  className={field}
                />
              </label>
              <label className="flex items-center gap-2 pt-5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set("active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                Aktifkan kupon ini
              </label>
            </div>
          </Section>

          <Section icon={<Layers className="h-3.5 w-3.5" />} title="Diskon & Syarat">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Jenis diskon</span>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const t = e.target.value as CouponType;
                    set("type", t);
                    if (t === "tiered" && tiers.length === 0) addTier();
                  }}
                  className={field}
                >
                  <option value="percent">{COUPON_TYPE_LABEL.percent}</option>
                  <option value="amount">{COUPON_TYPE_LABEL.amount}</option>
                  <option value="tiered">{COUPON_TYPE_LABEL.tiered}</option>
                </select>
              </label>

              {form.type !== "tiered" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>
                    {form.type === "percent" ? "Diskon (%)" : "Diskon (Rp)"}
                  </span>
                  <input
                    type="number"
                    min={form.type === "percent" ? 1 : 0}
                    max={form.type === "percent" ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => set("value", Number(e.target.value))}
                    className={cn(field, fieldBorder("value"))}
                    {...fieldA11y("value")}
                  />
                  {renderFieldError("value")}
                </label>
              )}

              {form.type === "tiered" && (
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className={labelCls}>Tingkat diskon (by subtotal)</span>
                    <button
                      type="button"
                      onClick={addTier}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-secondary hover:border-primary/40 hover:text-primary"
                    >
                      <Plus className="h-3 w-3" /> Tambah tingkat
                    </button>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {tiers.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-surface px-3 py-2 text-[11px] text-muted">
                        Belum ada tingkat. Klik “Tambah tingkat”.
                      </p>
                    )}
                    {tiers.map((t, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2"
                      >
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[11px] text-slate-400">
                            ≥Rp
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={t.minSpend}
                            onChange={(e) => updateTier(i, { minSpend: Number(e.target.value) })}
                            aria-label="Minimal subtotal tier"
                            className={cn(field, "pl-9")}
                          />
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={t.value}
                            onChange={(e) => updateTier(i, { value: Number(e.target.value) })}
                            aria-label="Nilai diskon tier"
                            className={cn(field, "pr-12")}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                            {t.kind === "percent" ? "%" : "Rp"}
                          </span>
                        </div>
                        <select
                          value={t.kind}
                          onChange={(e) =>
                            updateTier(i, { kind: e.target.value as "percent" | "amount" })
                          }
                          aria-label="Jenis nilai tier"
                          className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs text-secondary"
                        >
                          <option value="percent">%</option>
                          <option value="amount">Rp</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeTier(i)}
                          aria-label="Hapus tingkat"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {renderFieldError("tiers")}
                </div>
              )}

              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Min. Belanja (Rp)</span>
                <input
                  type="number"
                  min={0}
                  value={form.minSpend}
                  onChange={(e) => set("minSpend", Number(e.target.value))}
                  className={cn(field, fieldBorder("minSpend"))}
                  {...fieldA11y("minSpend")}
                />
                {renderFieldError("minSpend")}
              </label>

              {form.type === "percent" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Maks. Diskon (Rp, opsional)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.maxDiscount ?? ""}
                    onChange={(e) =>
                      set("maxDiscount", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className={cn(field, fieldBorder("maxDiscount"))}
                    {...fieldA11y("maxDiscount")}
                  />
                  {renderFieldError("maxDiscount")}
                </label>
              )}
            </div>
          </Section>

          <Section
            icon={<Target className="h-3.5 w-3.5" />}
            title="Batas & Kuota"
            desc="Kosongkan untuk tanpa batas."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Kuota Total</span>
                <input
                  type="number"
                  min={1}
                  value={form.usageLimit ?? ""}
                  placeholder="∞"
                  onChange={(e) =>
                    set("usageLimit", e.target.value ? Number(e.target.value) : undefined)
                  }
                  className={cn(field, fieldBorder("usageLimit"))}
                  {...fieldA11y("usageLimit")}
                />
                {renderFieldError("usageLimit")}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Kuota harian</span>
                <input
                  type="number"
                  min={1}
                  value={form.perDayLimit ?? ""}
                  placeholder="∞"
                  onChange={(e) =>
                    set("perDayLimit", e.target.value ? Number(e.target.value) : undefined)
                  }
                  className={cn(field, fieldBorder("perDayLimit"))}
                  {...fieldA11y("perDayLimit")}
                />
                {renderFieldError("perDayLimit")}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Batas per User (0 = tanpa batas)</span>
                <input
                  type="number"
                  min={0}
                  value={form.limitPerUser ?? 0}
                  onChange={(e) => set("limitPerUser", Math.max(0, Number(e.target.value)))}
                  className={cn(field, fieldBorder("limitPerUser"))}
                  {...fieldA11y("limitPerUser")}
                />
                {renderFieldError("limitPerUser")}
              </label>
              <label className="flex items-center gap-2 pt-5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.singleUse ?? false}
                  onChange={(e) => set("singleUse", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                Sekali pakai (single-use)
              </label>
            </div>
          </Section>

          <Section
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            title="Jadwal & Masa Berlaku"
            desc="Kosongkan bila berlaku tanpa batas waktu."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Mulai</span>
                <input
                  type="datetime-local"
                  value={form.startsAt ?? ""}
                  onChange={(e) => set("startsAt", e.target.value)}
                  className={cn(field, fieldBorder("startsAt"))}
                  {...fieldA11y("startsAt")}
                />
                {renderFieldError("startsAt")}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Berakhir</span>
                <input
                  type="datetime-local"
                  value={form.endsAt ?? ""}
                  onChange={(e) => set("endsAt", e.target.value)}
                  className={cn(field, fieldBorder("endsAt"))}
                  {...fieldA11y("endsAt")}
                />
                {renderFieldError("endsAt")}
              </label>
            </div>
          </Section>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")}
            />
            {showAdvanced ? "Sembunyikan opsi lanjutan" : "Opsi lanjutan"}
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-4">
              <Section
                icon={<UserRound className="h-3.5 w-3.5" />}
                title="Penargetan"
                desc="Batasi siapa yang boleh memakai kode ini."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Segmen pelanggan</span>
                    <select
                      value={form.audience ?? "semua"}
                      onChange={(e) =>
                        set("audience", e.target.value as CouponFormInput["audience"])
                      }
                      className={field}
                    >
                      <option value="semua">{COUPON_AUDIENCE_LABEL.semua}</option>
                      <option value="baru">{COUPON_AUDIENCE_LABEL.baru}</option>
                      <option value="lama">{COUPON_AUDIENCE_LABEL.lama}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Khusus email (opsional)</span>
                    <input
                      type="email"
                      value={form.assignedEmail ?? ""}
                      onChange={(e) => set("assignedEmail", e.target.value)}
                      placeholder="nama@email.com"
                      className={cn(field, fieldBorder("assignedEmail"))}
                      {...fieldA11y("assignedEmail")}
                    />
                    {renderFieldError("assignedEmail")}
                  </label>
                </div>
              </Section>

              <Section
                icon={<Layers className="h-3.5 w-3.5" />}
                title="Kupon Bundel"
                desc="Batasi agar hanya berlaku untuk produk/jumlah item tertentu."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Wajib ada produk (slug, 1 per baris)</span>
                    <textarea
                      rows={3}
                      value={(form.appliesToSlugs ?? []).join("\n")}
                      onChange={(e) =>
                        set(
                          "appliesToSlugs",
                          e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder={"template-landing-page-bisnis\naplikasi-kasir-sederhana"}
                      className={cn(field, "resize-none font-mono text-xs")}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Minimal jumlah item (qty)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.minItems ?? ""}
                      onChange={(e) =>
                        set("minItems", e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="mis. 2"
                      className={field}
                    />
                  </label>
                </div>
              </Section>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.stackable ?? false}
                  onChange={(e) => set("stackable", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                Boleh digabung kupon lain (stackable)
              </label>
            </div>
          )}
        </div>

        {/* Kolom pratinjau */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Pratinjau
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary">
                <BadgePercent className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                {form.type === "tiered"
                  ? valueText
                  : form.type === "percent"
                    ? `Hemat ${form.value}%`
                    : formatRupiah(form.value)}
              </span>
            </div>
            <p className="mt-3 inline-block rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-white">
              {form.code.trim().toUpperCase() || "KODE-ST"}
            </p>
            {form.description && (
              <p className="mt-2 text-xs text-slate-600">{form.description}</p>
            )}
            <ul className="mt-3 flex flex-col gap-1 text-[11px] text-muted">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-500" />
                {form.minSpend > 0
                  ? `Min. belanja ${formatRupiah(form.minSpend)}`
                  : "Tanpa minimum belanja"}
              </li>
              {form.type === "percent" && form.maxDiscount ? (
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Maks. diskon {formatRupiah(form.maxDiscount)}
                </li>
              ) : null}
              {form.singleUse ? (
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Sekali pakai
                </li>
              ) : null}
              {form.audience && form.audience !== "semua" ? (
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500" />
                  {COUPON_AUDIENCE_LABEL[form.audience]}
                </li>
              ) : null}
              {form.campaign ? (
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Kampanye: {form.campaign}
                </li>
              ) : null}
            </ul>
            <span
              className={cn(
                "mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                form.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
              )}
            >
              {form.active ? "Aktif" : "Nonaktif"}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            Pratinjau mengikuti data yang diisi. Tampilan asli di `/promo`.
          </p>
        </aside>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Footer aksi */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <p className="hidden text-xs text-muted sm:block">
          {COUPON_TYPE_LABEL[form.type]} · {valueText}
          {form.minSpend > 0 ? ` · min ${formatRupiah(form.minSpend)}` : ""}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Buat Kupon"}
          </button>
        </div>
      </div>
    </form>
  );
}
