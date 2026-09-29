"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteProject,
  fetchProjects,
  saveProject,
} from "@/lib/admin-api";
import type { Project, StoredProject } from "@/lib/project-types";
import { useSiteContent } from "@/components/admin/use-site-content";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

const emptyProject: Project = {
  slug: "",
  title: "",
  client: "",
  category: "Website",
  serviceSlug: "pembuatan-website",
  year: new Date().getFullYear(),
  summary: "",
  cover: "default",
  accent: "from-[#004EDF] to-[#4D82EC]",
  tags: [],
  challenge: "",
  solution: "",
  results: [],
  metrics: [],
  techStack: [],
};

export function ProjectsManager() {
  const [items, setItems] = useState<StoredProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { content } = useSiteContent();
  const services = content.services;

  const load = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat proyek.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProjects();
        if (!active) return;
        setItems(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat proyek.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onNew = () => {
    setEditing({ ...emptyProject });
    setIsNew(true);
  };

  const onEdit = (p: StoredProject) => {
    const { id: _id, ...rest } = p;
    void _id;
    setEditing({ ...rest });
    setIsNew(false);
  };

  const onDelete = async (slug: string, title: string) => {
    if (!confirm(`Hapus proyek "${title}"? Tindakan ini permanen.`)) return;
    const prev = items;
    setItems((ls) => ls.filter((l) => l.slug !== slug));
    try {
      await deleteProject(slug);
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  const onSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveProject(editing);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <ProjectForm
        project={editing}
        isNew={isNew}
        saving={saving}
        services={services}
        onChange={setEditing}
        onSave={onSave}
        onCancel={() => setEditing(null)}
        error={error}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{items.length} proyek</p>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Muat ulang
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Proyek Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat proyek...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">Belum ada proyek.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((p) => (
            <div
              key={p.slug}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-primary">{p.category}</span>
                  <span className="text-slate-300">•</span>
                  <span>{p.client}</span>
                  <span className="text-slate-300">•</span>
                  <span>{p.year}</span>
                </div>
                <h3 className="mt-0.5 truncate text-sm font-bold text-secondary">
                  {p.title}
                </h3>
                <p className="truncate text-xs text-muted">/{p.slug}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/portofolio/${p.slug}`}
                  target="_blank"
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Lihat di website"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => onEdit(p)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(p.slug, p.title)}
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
    </div>
  );
}

function ProjectForm({
  project,
  isNew,
  saving,
  services,
  onChange,
  onSave,
  onCancel,
  error,
}: {
  project: Project;
  isNew: boolean;
  saving: boolean;
  services: { slug: string; title: string }[];
  onChange: (p: Project) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    onChange({ ...project, [key]: value });

  const setList = (key: "tags" | "results" | "techStack", value: string) =>
    set(
      key,
      value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-secondary">
          {isNew ? "Proyek Baru" : "Edit Proyek"}
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
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Judul">
            <input
              value={project.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Nama proyek"
              className={fieldBase}
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              value={project.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="otomatis dari judul bila kosong"
              className={fieldBase}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Klien">
            <input
              value={project.client}
              onChange={(e) => set("client", e.target.value)}
              placeholder="Nama klien"
              className={fieldBase}
            />
          </Field>
          <Field label="Kategori">
            <input
              value={project.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="mis. Website"
              className={fieldBase}
            />
          </Field>
          <Field label="Tahun">
            <input
              type="number"
              value={project.year}
              onChange={(e) => set("year", Number(e.target.value))}
              className={fieldBase}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Layanan terkait">
            <select
              value={project.serviceSlug}
              onChange={(e) => set("serviceSlug", e.target.value)}
              className={fieldBase}
            >
              {services.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gradient accent (Tailwind)">
            <input
              value={project.accent}
              onChange={(e) => set("accent", e.target.value)}
              placeholder="from-[#004EDF] to-[#4D82EC]"
              className={fieldBase}
            />
          </Field>
        </div>

        <Field label="Ringkasan">
          <textarea
            rows={2}
            value={project.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Ringkasan singkat proyek"
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <Field label="Tantangan">
          <textarea
            rows={3}
            value={project.challenge}
            onChange={(e) => set("challenge", e.target.value)}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <Field label="Solusi">
          <textarea
            rows={3}
            value={project.solution}
            onChange={(e) => set("solution", e.target.value)}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Tags (1 per baris)">
            <textarea
              rows={4}
              value={project.tags.join("\n")}
              onChange={(e) => setList("tags", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>
          <Field label="Hasil (1 per baris)">
            <textarea
              rows={4}
              value={project.results.join("\n")}
              onChange={(e) => setList("results", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>
          <Field label="Teknologi (1 per baris)">
            <textarea
              rows={4}
              value={project.techStack.join("\n")}
              onChange={(e) => setList("techStack", e.target.value)}
              className={cn(fieldBase, "resize-none")}
            />
          </Field>
        </div>

        <Field label="Metrik (format: Label = Nilai, 1 per baris)">
          <textarea
            rows={3}
            value={project.metrics.map((m) => `${m.label} = ${m.value}`).join("\n")}
            onChange={(e) =>
              set(
                "metrics",
                e.target.value
                  .split("\n")
                  .map((line) => {
                    const [label, value] = line.split("=");
                    return {
                      label: (label ?? "").trim(),
                      value: (value ?? "").trim(),
                    };
                  })
                  .filter((m) => m.label && m.value),
              )
            }
            placeholder={"Waktu muat = < 1,5s\nSkor performa = 95+"}
            className={cn(fieldBase, "resize-none")}
          />
        </Field>

        <div className="rounded-2xl border border-slate-200 bg-surface p-5">
          <p className="text-sm font-semibold text-secondary">
            Testimoni (opsional)
          </p>
          <div className="mt-3 grid gap-4">
            <textarea
              rows={2}
              value={project.testimonial?.quote ?? ""}
              onChange={(e) =>
                set("testimonial", {
                  quote: e.target.value,
                  author: project.testimonial?.author ?? "",
                  role: project.testimonial?.role ?? "",
                })
              }
              placeholder="Kutipan testimoni"
              className={cn(fieldBase, "resize-none")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={project.testimonial?.author ?? ""}
                onChange={(e) =>
                  set("testimonial", {
                    quote: project.testimonial?.quote ?? "",
                    author: e.target.value,
                    role: project.testimonial?.role ?? "",
                  })
                }
                placeholder="Nama"
                className={fieldBase}
              />
              <input
                value={project.testimonial?.role ?? ""}
                onChange={(e) =>
                  set("testimonial", {
                    quote: project.testimonial?.quote ?? "",
                    author: project.testimonial?.author ?? "",
                    role: e.target.value,
                  })
                }
                placeholder="Jabatan, Perusahaan"
                className={fieldBase}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        Gambar proyek dikelola di menu{" "}
        <Link href="/admin/media" className="font-semibold text-primary">
          Media
        </Link>{" "}
        (pilih &quot;Proyek terkait&quot;).
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Proyek
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
