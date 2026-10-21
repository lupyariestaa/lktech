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
    /** `true` bila ada sumber yang dipotong karena melebihi `EXPORT_CAP` (G4). */
    truncated?: boolean;
    /** Sumber yang datanya dipotong (bila `truncated`). */
    truncatedSources?: BackupSource[];
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

/** Batas jumlah dokumen yang boleh ditulis saat IMPOR (anti-overload). */
export const IMPORT_CAP = 5000;

/** ID dokumen pengaturan (harus cocok dengan `SETTINGS_DOC_ID`). */
export const SETTINGS_DOC_ID = "site";

type Row = { _id: string; [k: string]: unknown };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SanitizedRow =
  | { ok: true; id: string; data: Record<string, unknown> }
  | { ok: false; reason: string };

/**
 * Menyaring & menormalkan SATU baris backup sebelum ditulis (gap G2/G3).
 *
 * Aturan keamanan (KRITIS):
 * - `_id` wajib ada & string non-kosong.
 * - Sumber `admins`:
 *   - `_id` harus email valid (dinormalisasi lowercase);
 *   - bila email adalah OWNER (`ownerEmails`) → **DILARANG ditulis** (lewati),
 *     karena OWNER berasal dari env & tidak boleh ditimpa lewat backup;
 *   - **paksa `active: true`** agar file backup yang dimodifikasi tak bisa
 *     menonaktifkan admin (lockout).
 * - Sumber `settings`: `_id` DIPAKSA = `SETTINGS_DOC_ID` (`site`), bukan `_id`
 *   bebas, agar tak menyuntik/menimpa dokumen settings lain.
 *
 * `data` = isi dokumen (tanpa `_id`), hanya menerima objek.
 */
export function sanitizeBackupRow(
  source: BackupSource,
  rawRow: unknown,
  ownerEmails: readonly string[],
): SanitizedRow {
  if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
    return { ok: false, reason: "baris bukan objek" };
  }
  const row = rawRow as Row;
  const id = typeof row._id === "string" ? row._id.trim() : "";
  if (!id) return { ok: false, reason: "_id kosong" };

  // Salin isi dokumen tanpa `_id` (spread lalu hapus) — hindari variabel sisa.
  const data: Record<string, unknown> = { ...row };
  delete data._id;

  if (source === "admins") {
    const email = id.toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, reason: "id admin bukan email" };
    if (ownerEmails.some((o) => o.trim().toLowerCase() === email)) {
      return { ok: false, reason: "OWNER dilindungi" };
    }
    // Paksa aktif & samakan field email.
    data.email = email;
    data.active = true;
    return { ok: true, id: email, data };
  }

  if (source === "settings") {
    return { ok: true, id: SETTINGS_DOC_ID, data };
  }

  return { ok: true, id, data };
}

/** Kebijakan impor: hanya OWNER yang boleh memulihkan koleksi `admins`. */
export type ImportPolicy = {
  allowAdmins: boolean;
};

/** Hasil rencana impor (murni) — dipakai untuk dry-run & eksekusi. */
export type ImportPlan = {
  /** Baris yang valid & akan ditulis (sudah tersaring). */
  operations: Array<{ source: BackupSource; id: string; data: Record<string, unknown> }>;
  /** Baris yang dilewati/ditolak beserta alasan (ringkas). */
  skipped: number;
  /** `true` bila jumlah baris melebihi `IMPORT_CAP` (baris berlebih dibuang). */
  truncated: boolean;
  perSource: Array<{ source: BackupSource; total: number; accepted: number; skipped: number }>;
};

/**
 * Membangun RENCANA impor dari bundle yang sudah tervalidasi (murni).
 *
 * - Menerapkan `sanitizeBackupRow` per baris (keamanan G2/G3).
 * - `admins` hanya direncanakan bila `policy.allowAdmins` (khusus OWNER).
 * - Batasi total operasi ke `IMPORT_CAP` (G4) & tandai `truncated`.
 * - Menghasilkan `perSource` untuk ringkasan/dry-run.
 */
export function planImport(
  bundle: BackupBundle,
  ownerEmails: readonly string[],
  policy: ImportPolicy = { allowAdmins: false },
): ImportPlan {
  const operations: ImportPlan["operations"] = [];
  const perSource: ImportPlan["perSource"] = [];
  let skipped = 0;
  let truncated = false;

  for (const [source, rows] of Object.entries(bundle.data) as Array<[BackupSource, unknown[]]>) {
    if (!Array.isArray(rows)) continue;

    // Fail-closed: pemanggil yang tidak secara eksplisit mengizinkan (OWNER)
    // tidak boleh menulis koleksi `admins`, walau route lupa memeriksa.
    if (source === "admins" && !policy.allowAdmins) {
      skipped += rows.length;
      perSource.push({ source, total: rows.length, accepted: 0, skipped: rows.length });
      continue;
    }

    let accepted = 0;
    let sourceSkipped = 0;

    for (const rawRow of rows) {
      if (operations.length >= IMPORT_CAP) {
        truncated = true;
        break;
      }
      const res = sanitizeBackupRow(source, rawRow, ownerEmails);
      if (!res.ok) {
        sourceSkipped += 1;
        skipped += 1;
        continue;
      }
      operations.push({ source, id: res.id, data: res.data });
      accepted += 1;
    }

    perSource.push({ source, total: rows.length, accepted, skipped: sourceSkipped });
  }

  return { operations, skipped, truncated, perSource };
}
