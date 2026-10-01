"use client";

import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useSiteContent } from "@/components/admin/use-site-content";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { ManagedService } from "@/lib/content-types";
import { cn, slugify } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

const emptyService: ManagedService = {
  slug: "",
  title: "",
  tagline: "",
  description: "",
  icon: "globe",
  accent: "from-[#004EDF] to-[#4D82EC]",
  waMessage: "",
  detail: {
    heroDescription: "",
    highlights: [],
    deliverables: [],
    features: [],
    steps: [],
    techStack: [],
    packages: [],
    faqs: [],
  },
};

export function ServicesManager() {
  const { content, loading, saving, error, loadFailed, reject, reload, commit } =
    useSiteContent();
  const [editing, setEditing] = useState<ManagedService | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<{ slug: string; title: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const services = content.services;
  // Ada form yang sedang terbuka → anggap ada perubahan belum disimpan.
  useRegisterDirty(editing !== null);

  const onNew = () => {
    setEditing(structuredClone(emptyService));
    setIsNew(true);
  };

  const onEdit = (s: ManagedService) => {
    setEditing(structuredClone(s));
    setIsNew(false);
  };

  const onSave = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      reject("Judul layanan wajib diisi.");
      return;
    }
    const slug = (editing.slug.trim() || slugify(title)).trim();
    if (!slug) {
      reject("Slug tidak valid.");
      return;
    }
    const nextService: ManagedService = { ...editing, title, slug };

    // Ganti bila sudah ada (berdasarkan slug lama), atau tambah baru.
    const originalSlug = isNew ? null : editing.slug;
    const others = services.filter((s) => s.slug !== originalSlug);
    const exists = others.some((s) => s.slug === nextService.slug);
    if (exists) {
      reject(`Slug "${nextService.slug}" sudah dipakai layanan lain.`);
      return;
    }

    const ok = await commit(
      { services: [...others, nextService] },
      { successMessage: "Layanan berhasil disimpan." },
    );
    if (ok) setEditing(null);
  };

  const onDelete = async (slug: string, title: string) => {
    setToDelete({ slug, title });
  };

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    const ok = await commit(
      { services: services.filter((s) => s.slug !== target.slug) },
      { successMessage: `Layanan "${target.title}" dihapus.` },
    );
    if (ok) setToDelete(null);
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat layanan…</span>
      </div>
    );
  }

  if (editing) {
    return (
      <ServiceForm
        service={editing}
        isNew={isNew}
        saving={saving}
        loadFailed={loadFailed}
        error={error}
        onChange={setEditing}
        onSave={onSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{services.length} layanan</p>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", saving && "animate-spin")} />
            Muat ulang
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Layanan Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
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

      {services.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">Belum ada layanan.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {services.map((s) => (
            <div
              key={s.slug}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-secondary">
                  {s.title}
                </h3>
                <p className="truncate text-xs text-muted">
                  /{s.slug} · {s.detail.packages.length} paket ·{" "}
                  {s.detail.faqs.length} FAQ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(s)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(s.slug, s.title)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus layanan ini?"
        description={`Layanan "${toDelete?.title}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function ServiceForm({
  service,
  isNew,
  saving,
  loadFailed,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  service: ManagedService;
  isNew: boolean;
  saving: boolean;
  loadFailed: boolean;
  error: string | null;
  onChange: (s: ManagedService) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof ManagedService>(
    key: K,
    value: ManagedService[K],
  ) => onChange({ ...service, [key]: value });

  const setDetail = <K extends keyof ManagedService["detail"]>(
    key: K,
    value: ManagedService["detail"][K],
  ) => onChange({ ...service, detail: { ...service.detail, [key]: value } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-secondary">
          {isNew ? "Layanan Baru" : "Edit Layanan"}
        </h2>
        <button
          onClick={onCancel}
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-secondary"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}
            {loadFailed && (
              <span className="mt-1 block text-xs text-rose-500">
                Muat ulang halaman sebelum menyimpan agar tidak menimpa data
                yang ada.
              </span>
            )}
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-6">
        {/* ===== Info dasar ===== */}
        <Section title="Info dasar">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Judul">
              <input
                value={service.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="mis. Pembuatan Website"
                className={fieldBase}
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                value={service.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="otomatis dari judul bila kosong"
                className={fieldBase}
              />
            </Field>
          </div>

          <Field label="Tagline (tampil di kartu)">
            <input
              value={service.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Ringkas, 1 baris"
              className={fieldBase}
            />
          </Field>

          <Field label="Deskripsi singkat (kartu & SEO)">
            <textarea
              rows={2}
              value={service.description}
              onChange={(e) => set("description", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Ikon (nama)">
              <input
                value={service.icon}
                onChange={(e) => set("icon", e.target.value)}
                placeholder="globe"
                className={fieldBase}
              />
            </Field>
            <Field label="Accent (Tailwind gradient)">
              <input
                value={service.accent}
                onChange={(e) => set("accent", e.target.value)}
                placeholder="from-[#004EDF] to-[#4D82EC]"
                className={fieldBase}
              />
            </Field>
            <Field label="Pesan WhatsApp (waMessage)">
              <input
                value={service.waMessage}
                onChange={(e) => set("waMessage", e.target.value)}
                placeholder="Halo, saya ingin konsultasi..."
                className={fieldBase}
              />
            </Field>
          </div>
        </Section>

        {/* ===== Detail ===== */}
        <Section title="Detail halaman">
          <Field label="Deskripsi hero">
            <textarea
              rows={3}
              value={service.detail.heroDescription}
              onChange={(e) => setDetail("heroDescription", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>
        </Section>

        <Section title="Highlights (kenapa memilih — 1 per baris)">
          <StringListEditor
            items={service.detail.highlights}
            onChange={(v) => setDetail("highlights", v)}
            placeholder="Desain custom sesuai brand"
          />
        </Section>

        <Section title="Deliverables (apa yang didapat)">
          <PairListEditor
            items={service.detail.deliverables}
            onChange={(v) => setDetail("deliverables", v)}
            titlePlaceholder="Judul, mis. Website Profil"
            descPlaceholder="Deskripsi"
          />
        </Section>

        <Section title="Fitur utama (butuh ikon)">
          <FeatureListEditor
            items={service.detail.features}
            onChange={(v) => setDetail("features", v)}
          />
        </Section>

        <Section title="Langkah pengerjaan">
          <PairListEditor
            items={service.detail.steps}
            onChange={(v) => setDetail("steps", v)}
            titlePlaceholder="Judul langkah"
            descPlaceholder="Deskripsi langkah"
          />
        </Section>

        <Section title="Teknologi & Tools (1 per baris)">
          <StringListEditor
            items={service.detail.techStack}
            onChange={(v) => setDetail("techStack", v)}
            placeholder="Next.js"
          />
        </Section>

        <Section title="Paket">
          <PackageListEditor
            items={service.detail.packages}
            onChange={(v) => setDetail("packages", v)}
          />
        </Section>

        <Section title="FAQ layanan">
          <PairListEditor
            items={service.detail.faqs.map((f) => ({
              title: f.question,
              description: f.answer,
            }))}
            onChange={(v) =>
              setDetail(
                "faqs",
                v.map((x) => ({ question: x.title, answer: x.description })),
              )
            }
            titlePlaceholder="Pertanyaan"
            descPlaceholder="Jawaban"
            descRows={3}
          />
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving || loadFailed}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Layanan
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/* ================= Sub-editors ================= */

function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? e.target.value : x)))
            }
            placeholder={placeholder}
            className={fieldBase}
          />
          <RemoveBtn onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddBtn
        label="Tambah baris"
        onClick={() => onChange([...items, ""])}
      />
    </div>
  );
}

function PairListEditor({
  items,
  onChange,
  titlePlaceholder,
  descPlaceholder,
  descRows = 2,
}: {
  items: { title: string; description: string }[];
  onChange: (v: { title: string; description: string }[]) => void;
  titlePlaceholder?: string;
  descPlaceholder?: string;
  descRows?: number;
}) {
  const update = (i: number, patch: Partial<{ title: string; description: string }>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-surface p-4"
        >
          <div className="flex items-center gap-2">
            <input
              value={item.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder={titlePlaceholder}
              className={fieldBase}
            />
            <RemoveBtn onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
          <textarea
            rows={descRows}
            value={item.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder={descPlaceholder}
            className={cn(fieldBase, "mt-2 resize-none")}
          />
        </div>
      ))}
      <AddBtn
        label="Tambah item"
        onClick={() => onChange([...items, { title: "", description: "" }])}
      />
    </div>
  );
}

function FeatureListEditor({
  items,
  onChange,
}: {
  items: { title: string; description: string; icon: string }[];
  onChange: (v: { title: string; description: string; icon: string }[]) => void;
}) {
  const update = (
    i: number,
    patch: Partial<{ title: string; description: string; icon: string }>,
  ) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-surface p-4"
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <input
              value={item.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Judul fitur"
              className={fieldBase}
            />
            <input
              value={item.icon}
              onChange={(e) => update(i, { icon: e.target.value })}
              placeholder="ikon (mis. zap)"
              className={fieldBase}
            />
            <RemoveBtn
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            />
          </div>
          <textarea
            rows={2}
            value={item.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Deskripsi fitur"
            className={cn(fieldBase, "mt-2 resize-none")}
          />
        </div>
      ))}
      <AddBtn
        label="Tambah fitur"
        onClick={() =>
          onChange([...items, { title: "", description: "", icon: "sparkles" }])
        }
      />
    </div>
  );
}

function PackageListEditor({
  items,
  onChange,
}: {
  items: { name: string; suitedFor: string; points: string[] }[];
  onChange: (v: { name: string; suitedFor: string; points: string[] }[]) => void;
}) {
  const update = (
    i: number,
    patch: Partial<{ name: string; suitedFor: string; points: string[] }>,
  ) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-surface p-4"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={item.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Nama paket"
              className={fieldBase}
            />
            <input
              value={item.suitedFor}
              onChange={(e) => update(i, { suitedFor: e.target.value })}
              placeholder="Cocok untuk"
              className={fieldBase}
            />
          </div>
          <textarea
            rows={3}
            value={item.points.join("\n")}
            onChange={(e) =>
              update(i, {
                points: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Poin paket (1 per baris)"
            className={cn(fieldBase, "mt-2 resize-none")}
          />
          <div className="mt-2 flex justify-end">
            <RemoveBtn
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            />
          </div>
        </div>
      ))}
      <AddBtn
        label="Tambah paket"
        onClick={() =>
          onChange([...items, { name: "", suitedFor: "", points: [] }])
        }
      />
    </div>
  );
}

/* ================= Primitives ================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold text-secondary">{title}</h3>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">{label}</span>
      {children}
    </label>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
      aria-label="Hapus"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
