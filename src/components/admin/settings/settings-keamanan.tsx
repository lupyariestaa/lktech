"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Crown,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  fetchAdmins,
  addAdmin,
  removeAdmin,
  type AdminMember,
} from "@/lib/admin-settings-api";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/** Halaman Keamanan & Akses (fase S4). */
export function SettingsKeamanan() {
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [me, setMe] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState<AdminMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetchAdmins();
        setAdmins(r.admins);
        setMe(r.me);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat admin.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const iAmOwner = admins.some((a) => a.isOwner && a.email === me);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addAdmin({ email: email.trim(), name: name.trim() || undefined });
      toast.success(`Admin ${email.trim()} ditambahkan.`);
      setEmail("");
      setName("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah admin.");
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await removeAdmin(toRemove.email);
      toast.success("Admin dihapus.");
      setToRemove(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus admin.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary-50/60 px-4 py-3 text-sm text-primary">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Akun admin dapat masuk ke dashboard ini dengan Google. <strong>OWNER</strong> (dari env)
          tidak dapat dihapus. Hanya OWNER yang dapat menambah/menghapus admin.
        </span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-secondary">Daftar Admin</h2>
            <p className="mt-1 text-xs text-muted">{admins.length} akun memiliki akses dashboard.</p>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-slate-100">
            {admins.map((a) => (
              <li key={a.email} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      a.isOwner
                        ? "grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600"
                        : "grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary"
                    }
                  >
                    {a.isOwner ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <span className="truncate">{a.email}</span>
                      {a.email === me && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Anda
                        </span>
                      )}
                      {a.isOwner && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          OWNER
                        </span>
                      )}
                    </p>
                    {a.name && <p className="text-xs text-muted">{a.name}</p>}
                  </div>
                </div>
                {!a.isOwner && iAmOwner && (
                  <button
                    type="button"
                    onClick={() => setToRemove(a)}
                    aria-label={`Hapus admin ${a.email}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {iAmOwner ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
            <UserPlus className="h-4 w-4" /> Tambah Admin
          </h2>
          <p className="mt-1 text-xs text-muted">
            Masukkan email Google yang akan dijadikan admin. Akun itu cukup login dengan Google.
          </p>
          <form onSubmit={onAdd} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className={field}
              aria-label="Email admin baru"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama (opsional)"
              className={field}
              aria-label="Nama admin (opsional)"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah
            </button>
          </form>
        </section>
      ) : (
        <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-surface px-4 py-3 text-sm text-muted">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Hanya OWNER yang dapat menambah/menghapus admin.
        </div>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title={toRemove ? `Hapus admin ${toRemove.email}?` : "Hapus admin?"}
        description="Akun ini tidak akan bisa mengakses dashboard lagi. Tindakan ini dapat ditambahkan ulang kapan saja."
        confirmLabel="Hapus"
        busy={removing}
        onConfirm={onRemove}
        onCancel={() => setToRemove(null)}
      />
    </div>
  );
}
