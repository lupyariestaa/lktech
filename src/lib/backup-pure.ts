/**
 * Logika BACKUP murni (fase S7) — definisi sumber, validasi, ringkasan.
 * Bebas impor runtime agar dapat diuji Node.
 */

/** Sumber data yang dapat di-backup (select/unselect). */
export const BACKUP_SOURCES = [
  "settings",
  "admins",
  "products",
  "coupons",
  "orders",
  "projects",
  "articles",
  "content",
  "users",
  "subscribers",
  "reviews",
] as const;

export type BackupSource = (typeof BACKUP_SOURCES)[number];

export const BACKUP_SOURCE_LABEL: Record<BackupSource, string> = {
  settings: "Pengaturan situs",
  admins: "Daftar admin",
  products: "Produk",
  coupons: "Kupon",
  orders: "Pesanan",
  projects: "Portofolio",
  articles: "Blog/Artikel",
  content: "Konten beranda",
  users: "Pengguna",
  subscribers: "Pelanggan newsletter",
  reviews: "Ulasan",
};

/** Versi format bundle — dipakai untuk validasi kompatibilitas. */
export const BACKUP_VERSION = 1;

/** Bentuk bundle backup. */
export type BackupBundle = {
  meta: {
    version: number;
    createdAtISO: string;
    by: string;
    sources: BackupSource[];
  };
  data: Partial<Record<BackupSource, unknown[]>>;
};

/** Hasil validasi bundle. */
export type BackupValidation =
  | { ok: true; bundle: BackupBundle }
  | { ok: false; error: string };

const VALID_SOURCES = new Set<string>(BACKUP_SOURCES);

/**
 * Validasi bundle backup (murni). Menolak: bukan objek, versi tak dikenal,
 * meta tak lengkap, sumber tak dikenal, atau data bukan array.
 */
export function validateBackupBundle(input: unknown): BackupValidation {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "File backup tidak valid." };
  }
  const b = input as Record<string, unknown>;
  const meta = b.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") {
    return { ok: false, error: "Meta backup tidak ditemukan." };
  }
  const version = typeof meta.version === "number" ? meta.version : 0;
  if (version !== BACKUP_VERSION) {
    return { ok: false, error: `Versi backup tidak didukung (${version}).` };
  }
  const sources = Array.isArray(meta.sources) ? meta.sources : [];
  for (const s of sources) {
    if (typeof s !== "string" || !VALID_SOURCES.has(s)) {
      return { ok: false, error: `Sumber backup tidak dikenal: ${String(s)}.` };
    }
  }
  const data = b.data;
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Data backup kosong." };
  }
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (!VALID_SOURCES.has(k)) {
      return { ok: false, error: `Data sumber tidak dikenal: ${k}.` };
    }
    if (!Array.isArray(v)) {
      return { ok: false, error: `Data "${k}" bukan array.` };
    }
  }
  return {
    ok: true,
    bundle: {
      meta: {
        version,
        createdAtISO: typeof meta.createdAtISO === "string" ? meta.createdAtISO : "",
        by: typeof meta.by === "string" ? meta.by : "",
        sources: sources as BackupSource[],
      },
      data: data as Partial<Record<BackupSource, unknown[]>>,
    },
  };
}

/** Ringkasan jumlah dokumen per sumber (untuk pratinjau impor). */
export function summarizeBackup(bundle: BackupBundle): Array<{ source: BackupSource; count: number }> {
  return (Object.entries(bundle.data) as Array<[BackupSource, unknown[]]>)
    .filter(([, rows]) => Array.isArray(rows))
    .map(([source, rows]) => ({ source, count: rows.length }));
}
