/**
 * Insight SEO BERBASIS ATURAN (fase D3) — logika murni, bebas impor runtime.
 *
 * Prinsip (lihat `docs/2026-10-25-planning-pengembangan-seo-dashboard.md`):
 * - **Transparan**: setiap insight menyertakan metrik sumber, aturan pemicu,
 *   ambang yang dipakai, keterbatasan, dan SATU tindakan manual.
 * - **Heuristik**: tidak ada skor black-box dan tidak ada ambang bisnis yang
 *   disembunyikan. Ambang adalah konfigurasi yang terlihat & dapat disesuaikan.
 * - **Tanpa sebab-akibat**: tidak ada klaim bahwa sebuah perubahan menaikkan
 *   peringkat. Selalu ada pengingat untuk mengukur ulang.
 * - **Tanpa aksi otomatis**: hanya saran; admin memutuskan secara manual.
 *
 * Modul ini menerima baris GSC yang sudah dinormalisasi (`GscRow`), sehingga
 * dapat diuji tanpa jaringan.
 */

import type { GscRow } from "@/lib/search-console-pure";

/** Jenis subjek insight. */
export type SeoInsightKind = "query" | "page";

/** Aturan pemicu yang didukung. */
export type SeoInsightRule =
  | "declining_clicks"
  | "impressions_without_clicks"
  | "low_ctr_high_impressions"
  | "striking_distance";

/** Ambang heuristik; semua ditampilkan ke admin saat insight dibuat. */
export type SeoInsightConfig = {
  /** Impresi minimum sebelum sebuah item dipertimbangkan. */
  minImpressions: number;
  /** CTR harus di bawah rasio ini × rata-rata CTR berbobot impresi himpunan. */
  ctrRatioBelowAverage: number;
  /** Batas bawah rentang posisi "dekat halaman pertama". */
  strikingDistanceMin: number;
  /** Batas atas rentang posisi "dekat halaman pertama". */
  strikingDistanceMax: number;
  /** Impresi minimum untuk menandai "impresi tanpa klik". */
  zeroClickMinImpressions: number;
  /** Penurunan klik minimum (rasio) vs periode pembanding. */
  declineRatio: number;
  /** Klik periode pembanding minimum sebelum penurunan dinilai material. */
  declineMinPreviousClicks: number;
  /** Batas maksimum insight per aturan. */
  maxPerRule: number;
};

export const DEFAULT_SEO_INSIGHT_CONFIG: SeoInsightConfig = {
  minImpressions: 50,
  ctrRatioBelowAverage: 0.5,
  strikingDistanceMin: 4,
  strikingDistanceMax: 20,
  zeroClickMinImpressions: 100,
  declineRatio: 0.3,
  declineMinPreviousClicks: 3,
  maxPerRule: 8,
};

/** Batas total insight yang dikembalikan (payload tetap ringkas). */
export const MAX_INSIGHTS = 24;

export const SEO_INSIGHT_RULE_LABEL: Record<SeoInsightRule, string> = {
  declining_clicks: "Klik menurun vs periode pembanding",
  impressions_without_clicks: "Impresi tanpa klik",
  low_ctr_high_impressions: "CTR rendah relatif pada impresi tinggi",
  striking_distance: "Posisi dekat halaman pertama",
};

/** Tindakan editorial yang bisa dicatat admin (non-otomatis). */
export const SEO_INSIGHT_DECISIONS = ["review_title", "update_content", "ignore"] as const;
export type SeoInsightDecision = (typeof SEO_INSIGHT_DECISIONS)[number];

export const SEO_INSIGHT_DECISION_LABEL: Record<SeoInsightDecision, string> = {
  review_title: "Tinjau judul/meta",
  update_content: "Perbarui konten",
  ignore: "Abaikan",
};

/** Satu insight siap tampil. */
export type SeoInsight = {
  /** ID stabil (rule + jenis + subjek) untuk korelasi log audit. */
  id: string;
  rule: SeoInsightRule;
  kind: SeoInsightKind;
  /** Teks query atau URL halaman. */
  subject: string;
  /** Urutan prioritas tampilan (0 = paling mendesak). */
  priority: number;
  metrics: { clicks: number; impressions: number; ctr: number; position: number };
  /** Ada hanya untuk aturan penurunan. */
  comparison?: { clicks: number; impressions: number; clickChange: number; clickChangeRatio: number | null };
  /** Penjelasan aturan pemicu + angka yang dipakai. */
  trigger: string;
  /** Ambang aktual saat insight dibuat (transparansi). */
  thresholds: Record<string, number>;
  /** Keterbatasan data/metode. */
  limitations: string[];
  /** Satu tindakan manual yang disarankan. */
  action: string;
  /** Selalu heuristik (bukan skor resmi). */
  heuristic: true;
  /** Rentang tanggal data (yyyy-mm-dd). */
  range: { startDate: string; endDate: string };
};

const BASE_LIMITATIONS = [
  "Ambang batas di atas adalah heuristik internal LKTech, bukan standar resmi Google.",
  "Data Search Console dapat tertunda beberapa hari dan sebagian query bernilai rendah disembunyikan untuk privasi.",
  "Hubungan ini bukan sebab-akibat: ukur ulang setelah crawl berikutnya dan data terkumpul.",
];

/** Hash FNV-1a sederhana untuk ID stabil lintas render. */
export function stableInsightId(parts: readonly string[]): string {
  const text = parts.join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Validasi URL publik: hanya terima URL absolut yang origin-nya sama dengan
 * situs. Mengembalikan `null` bila tidak aman (mis. host asing), agar UI tidak
 * pernah menautkan ke domain yang tidak dikenal.
 */
export function sameOriginUrl(origin: string | undefined | null, candidate: string): string | null {
  const raw = (candidate ?? "").trim();
  if (!raw || !origin) return null;
  try {
    const base = new URL(origin);
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin !== base.origin) return null;
    if (url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function clampConfig(overrides: Partial<SeoInsightConfig> | undefined): SeoInsightConfig {
  const base = { ...DEFAULT_SEO_INSIGHT_CONFIG, ...(overrides ?? {}) };
  const asCount = (value: number, fallback: number, max: number) => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, 0), max);
  };
  const minImpressions = asCount(base.minImpressions, DEFAULT_SEO_INSIGHT_CONFIG.minImpressions, 1_000_000);
  const zeroClickMinImpressions = Math.max(
    minImpressions,
    asCount(base.zeroClickMinImpressions, DEFAULT_SEO_INSIGHT_CONFIG.zeroClickMinImpressions, 1_000_000),
  );
  const strikingMin = asCount(base.strikingDistanceMin, DEFAULT_SEO_INSIGHT_CONFIG.strikingDistanceMin, 100);
  const strikingMax = Math.min(
    Math.max(asCount(base.strikingDistanceMax, DEFAULT_SEO_INSIGHT_CONFIG.strikingDistanceMax, 100), strikingMin),
    100,
  );
  const ratio = (value: number, fallback: number) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 1) return fallback;
    return n;
  };
  return {
    minImpressions,
    ctrRatioBelowAverage: ratio(base.ctrRatioBelowAverage, DEFAULT_SEO_INSIGHT_CONFIG.ctrRatioBelowAverage),
    strikingDistanceMin: strikingMin,
    strikingDistanceMax: strikingMax,
    zeroClickMinImpressions,
    declineRatio: ratio(base.declineRatio, DEFAULT_SEO_INSIGHT_CONFIG.declineRatio),
    declineMinPreviousClicks: asCount(
      base.declineMinPreviousClicks,
      DEFAULT_SEO_INSIGHT_CONFIG.declineMinPreviousClicks,
      1_000_000,
    ),
    maxPerRule: Math.min(Math.max(asCount(base.maxPerRule, DEFAULT_SEO_INSIGHT_CONFIG.maxPerRule, 50), 1), 50),
  };
}

function keyOf(row: GscRow): string {
  return row.keys?.[0] ?? "";
}

function weightedCtr(rows: readonly GscRow[]): number {
  const clicks = rows.reduce((n, r) => n + r.clicks, 0);
  const impressions = rows.reduce((n, r) => n + r.impressions, 0);
  return impressions > 0 ? clicks / impressions : 0;
}

function nf(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

type Candidate = Omit<SeoInsight, "limitations" | "heuristic" | "range" | "id"> & {
  /** Keterbatasan tambahan khusus aturan. */
  extraLimitations?: string[];
};

/**
 * Hitung insight dari baris GSC. `previousQueries`/`previousPages` opsional:
 * bila tidak tersedia, aturan penurunan dilewati (bukan dianggap nol).
 */
export function computeSeoInsights(input: {
  queries: readonly GscRow[];
  pages: readonly GscRow[];
  previousQueries?: readonly GscRow[];
  previousPages?: readonly GscRow[];
  origin?: string | null;
  range: { startDate: string; endDate: string };
  config?: Partial<SeoInsightConfig>;
}): SeoInsight[] {
  const config = clampConfig(input.config);
  const thresholds: Record<string, number> = {
    minImpressions: config.minImpressions,
    ctrRatioBelowAverage: config.ctrRatioBelowAverage,
    strikingDistanceMin: config.strikingDistanceMin,
    strikingDistanceMax: config.strikingDistanceMax,
    zeroClickMinImpressions: config.zeroClickMinImpressions,
    declineRatio: config.declineRatio,
    declineMinPreviousClicks: config.declineMinPreviousClicks,
  };

  const candidates: Candidate[] = [];

  const kinds: Array<{ kind: SeoInsightKind; rows: readonly GscRow[]; previous?: readonly GscRow[] }> = [
    { kind: "query", rows: input.queries, previous: input.previousQueries },
    { kind: "page", rows: input.pages, previous: input.previousPages },
  ];

  for (const { kind, rows, previous } of kinds) {
    const items = rows.filter((row) => keyOf(row) !== "");
    const avgCtr = weightedCtr(items);
    const prevByKey = new Map((previous ?? []).map((row) => [keyOf(row), row]));

    const push = (candidate: Omit<Candidate, "kind">) => candidates.push({ ...candidate, kind });

    // --- Aturan 1: klik menurun vs periode pembanding ---
    if (previous) {
      for (const row of items) {
        const before = prevByKey.get(keyOf(row));
        if (!before) continue;
        if (before.clicks < config.declineMinPreviousClicks) continue;
        const change = row.clicks - before.clicks;
        const dropRatio = before.clicks > 0 ? -change / before.clicks : 0;
        if (change >= 0 || dropRatio < config.declineRatio) continue;
        push({
          rule: "declining_clicks",
          subject: keyOf(row),
          priority: 0,
          metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
          comparison: {
            clicks: before.clicks,
            impressions: before.impressions,
            clickChange: change,
            clickChangeRatio: before.clicks > 0 ? change / before.clicks : null,
          },
          trigger: `Klik turun ${nf(before.clicks)} → ${nf(row.clicks)} (−${nf(dropRatio * 100)}%), melewati ambang ${nf(
            config.declineRatio * 100,
          )}% dengan minimal ${nf(config.declineMinPreviousClicks)} klik pembanding.`,
          thresholds,
          action: "Bandingkan periode dan periksa perubahan konten/teknis terakhir pada item ini.",
          extraLimitations: [
            "Periode pembanding sama panjangnya, tetapi bisa dipengaruhi musiman atau perubahan permintaan.",
          ],
        });
      }
    }

    // --- Aturan 2: impresi tanpa klik ---
    for (const row of items) {
      if (row.clicks !== 0) continue;
      if (row.impressions < config.zeroClickMinImpressions) continue;
      push({
        rule: "impressions_without_clicks",
        subject: keyOf(row),
        priority: 1,
        metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
        trigger: `0 klik dari ${nf(row.impressions)} impresi (ambang ${nf(config.zeroClickMinImpressions)}), posisi rata-rata ${row.position.toFixed(1)}.`,
        thresholds,
        action: "Periksa apakah judul dan deskripsi sudah sesuai maksud pencarian ini.",
      });
    }

    // --- Aturan 3: CTR rendah relatif pada impresi tinggi ---
    if (avgCtr > 0) {
      const cutoff = avgCtr * config.ctrRatioBelowAverage;
      for (const row of items) {
        if (row.impressions < config.minImpressions) continue;
        if (row.ctr >= cutoff) continue;
        push({
          rule: "low_ctr_high_impressions",
          subject: keyOf(row),
          priority: 2,
          metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
          trigger: `CTR ${nf(row.ctr * 100)}% berada di bawah ${nf(config.ctrRatioBelowAverage * 100)}% dari rata-rata CTR himpunan (${nf(
            avgCtr * 100,
          )}%) meski impresi ${nf(row.impressions)}.`,
          thresholds: { ...thresholds, averageCtrReference: avgCtr },
          action: "Tinjau ulang judul/meta agar lebih relevan dan menarik untuk query ini.",
        });
      }
    }

    // --- Aturan 4: posisi dekat halaman pertama ---
    for (const row of items) {
      if (row.position < config.strikingDistanceMin || row.position > config.strikingDistanceMax) continue;
      if (row.impressions < config.minImpressions) continue;
      push({
        rule: "striking_distance",
        subject: keyOf(row),
        priority: 3,
        metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
        trigger: `Posisi rata-rata ${row.position.toFixed(1)} berada dalam rentang ${nf(config.strikingDistanceMin)}–${nf(
          config.strikingDistanceMax,
        )} dengan ${nf(row.impressions)} impresi.`,
        thresholds,
        action: "Perkuat konten yang menargetkan item ini agar berpeluang naik ke halaman pertama.",
      });
    }
  }

  // Batasi jumlah per aturan (impresi terbesar lebih dulu) agar satu aturan
  // tidak membanjiri daftar.
  const perRuleCount = new Map<SeoInsightRule, number>();
  const limited = candidates
    .sort((a, b) => b.metrics.impressions - a.metrics.impressions)
    .filter((candidate) => {
      const used = perRuleCount.get(candidate.rule) ?? 0;
      if (used >= config.maxPerRule) return false;
      perRuleCount.set(candidate.rule, used + 1);
      return true;
    });

  // Satu insight per subjek: simpan aturan dengan prioritas tertinggi.
  const bestBySubject = new Map<string, Candidate>();
  for (const candidate of limited) {
    const key = `${candidate.kind}:${candidate.subject}`;
    const current = bestBySubject.get(key);
    if (!current || candidate.priority < current.priority) bestBySubject.set(key, candidate);
  }

  return [...bestBySubject.values()]
    .sort((a, b) => a.priority - b.priority || b.metrics.impressions - a.metrics.impressions)
    .slice(0, MAX_INSIGHTS)
    .map((candidate) => {
      const { extraLimitations, ...rest } = candidate;
      return {
        ...rest,
        id: stableInsightId([candidate.rule, candidate.kind, candidate.subject, input.range.startDate, input.range.endDate]),
        limitations: [...BASE_LIMITATIONS, ...(extraLimitations ?? [])],
        heuristic: true as const,
        range: input.range,
      };
    });
}
