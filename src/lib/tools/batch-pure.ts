/**
 * LOGIKA MURNI antrean batch tool gambar.
 *
 * Bebas impor runtime (tanpa alias `@/`) agar dapat diuji Node lewat
 * `--experimental-strip-types`. Modul ini tidak menyentuh DOM, File, atau
 * canvas; komponen klien tetap bertanggung jawab atas decode/encode dan
 * pencabutan object URL.
 */

/** Batas awal batch gambar. Nilai final harus divalidasi di perangkat nyata. */
export const IMAGE_BATCH_LIMITS = {
  maxFiles: 30,
  /** Samakan dengan IMAGE_LIMITS.maxFileBytes di image-tool-pure. */
  maxFileBytes: 15 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  /** Batas total hasil sebelum ZIP ditolak agar memori perangkat aman. */
  maxZipBytes: 100 * 1024 * 1024,
} as const;

export type BatchStatus =
  | "waiting"
  | "processing"
  | "success"
  | "failed"
  | "cancelled";

export type BatchSummary = {
  total: number;
  waiting: number;
  processing: number;
  success: number;
  failed: number;
  cancelled: number;
  finished: number;
};

export type BatchFileCheck =
  | { ok: true }
  | { ok: false; reason: string };

export type BatchCandidate = {
  /** Identitas stabil untuk deduplikasi (mis. nama+ukuran+waktu ubah). */
  key: string;
  /** Ukuran berkas dalam byte. */
  size: number;
  /** Hasil validasi tipe/ukuran per berkas. */
  check: BatchFileCheck;
};

export type BatchPlan = {
  /** Indeks kandidat yang boleh ditambahkan, sesuai urutan masukan. */
  accepted: number[];
  /** Kandidat yang ditolak beserta alasan yang ramah pengguna. */
  rejected: Array<{ index: number; reason: string }>;
};

/**
 * Tentukan berkas mana yang boleh masuk antrean. Aturan diterapkan berurutan:
 * validasi per berkas, duplikat, jumlah maksimum, lalu total ukuran.
 */
export function planBatchAddition(input: {
  existingKeys: readonly string[];
  existingBytes: number;
  candidates: readonly BatchCandidate[];
  limits: { maxFiles: number; maxTotalBytes: number };
}): BatchPlan {
  const { existingKeys, candidates, limits } = input;
  const existingBytes = Number.isFinite(input.existingBytes)
    ? Math.max(0, input.existingBytes)
    : 0;
  const seen = new Set(existingKeys.map((key) => key.trim().toLowerCase()));
  const accepted: number[] = [];
  const rejected: BatchPlan["rejected"] = [];
  let acceptedBytes = 0;

  candidates.forEach((candidate, index) => {
    const key = candidate.key.trim().toLowerCase();
    if (!candidate.check.ok) {
      rejected.push({ index, reason: candidate.check.reason });
      return;
    }
    if (!key) {
      rejected.push({ index, reason: "Berkas tidak dapat diidentifikasi." });
      return;
    }
    if (seen.has(key)) {
      rejected.push({ index, reason: "Berkas ini sudah ada dalam antrean." });
      return;
    }
    if (existingKeys.length + accepted.length >= limits.maxFiles) {
      rejected.push({
        index,
        reason: `Batas ${limits.maxFiles} berkas per batch tercapai.`,
      });
      return;
    }
    const nextBytes = existingBytes + acceptedBytes + Math.max(0, candidate.size);
    if (nextBytes > limits.maxTotalBytes) {
      rejected.push({
        index,
        reason: `Total ukuran melebihi batas ${formatMegabytes(limits.maxTotalBytes)} MB.`,
      });
      return;
    }
    seen.add(key);
    acceptedBytes += Math.max(0, candidate.size);
    accepted.push(index);
  });

  return { accepted, rejected };
}

/** Ringkas status antrean untuk UI dan pengumuman aksesibel. */
export function summarizeBatch(
  statuses: readonly BatchStatus[],
): BatchSummary {
  const summary: BatchSummary = {
    total: statuses.length,
    waiting: 0,
    processing: 0,
    success: 0,
    failed: 0,
    cancelled: 0,
    finished: 0,
  };
  for (const status of statuses) {
    summary[status] += 1;
  }
  summary.finished = summary.success + summary.failed + summary.cancelled;
  return summary;
}

/**
 * Sisipkan sufiks `-2`, `-3`, ... sebelum ekstensi sampai nama belum dipakai.
 * Perbandingan nama tidak peka huruf besar/kecil agar aman di Windows.
 */
export function makeUniqueOutputName(
  name: string,
  used: Iterable<string>,
): string {
  const normalized = name.trim() || "gambar";
  const taken = new Set(Array.from(used, (item) => item.toLowerCase()));
  if (!taken.has(normalized.toLowerCase())) return normalized;

  const dot = normalized.lastIndexOf(".");
  const hasExtension = dot > 0 && dot < normalized.length - 1;
  const base = hasExtension ? normalized.slice(0, dot) : normalized;
  const extension = hasExtension ? normalized.slice(dot) : "";
  let counter = 2;
  let candidate = `${base}-${counter}${extension}`;
  while (taken.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base}-${counter}${extension}`;
  }
  return candidate;
}

/** Terapkan penamaan unik pada daftar nama, mempertahankan urutan masukan. */
export function dedupeOutputNames(names: readonly string[]): string[] {
  const used: string[] = [];
  return names.map((name) => {
    const unique = makeUniqueOutputName(name, used);
    used.push(unique);
    return unique;
  });
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes)
    ? String(megabytes)
    : megabytes.toFixed(1).replace(".", ",");
}
