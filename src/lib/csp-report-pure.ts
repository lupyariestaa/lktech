/**
 * Parser LAPORAN PELANGGARAN CSP (ADM-05) — MURNI, bebas impor runtime agar
 * dapat diuji dengan `node --experimental-strip-types`.
 *
 * Konteks: CSP penuh masih dikirim sebagai `Report-Only` (belum di-*enforce*)
 * karena enforce menuntut verifikasi semua origin saat runtime (Cloudinary,
 * Firebase, Sentry, GA). Agar enforce kelak berbasis bukti — bukan tebakan —
 * kebijakan report-only menunjuk `report-uri /api/csp-report`, dan endpoint itu
 * memakai parser ini untuk merapikan laporan browser.
 *
 * Prinsip privasi (konsisten dengan modul observabilitas lain):
 * - **Hanya origin** yang disimpan (scheme://host) — path, query, dan fragmen
 *   dibuang, sehingga URL bertoken (mis. `/unduhan/<token>`) tidak bocor.
 * - Field dibatasi panjangnya & jumlah entri dibatasi agar tidak ada ledakan log.
 * - Tidak ada data sensitif: tanpa cookie, header, atau isi halaman.
 */

/** Satu pelanggaran CSP yang sudah dirapikan & aman untuk log. */
export type CspViolation = {
  /** Direktif yang dilanggar (mis. `script-src`). */
  directive: string;
  /** Origin/segmen yang diblokir (mis. `https://example.com`, `inline`, `eval`). */
  blocked: string;
  /** Origin dokumen tempat pelanggaran terjadi (mis. `https://situs.example`). */
  document: string;
};

/** Batas entri per laporan (anti ledakan). */
export const CSP_REPORT_MAX_ENTRIES = 20;
/** Batas panjang satu field. */
const MAX_FIELD = 200;
/** Batas panjang nilai "blocked" non-URL (keyword). */
const MAX_KEYWORD = 80;

function clamp(value: unknown, max = MAX_FIELD): string {
  if (typeof value !== "string") return "";
  const s = value.trim();
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Kurangi URL menjadi origin saja (`scheme://host`). Nilai non-URL (keyword CSP
 * seperti `inline`, `eval`, `self`, `data`) dikembalikan apa adanya (dibatasi).
 * URL tak valid → "" (dibuang, bukan diteruskan).
 */
function toOrigin(value: string): string {
  if (!value) return "";
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return clamp(value, MAX_KEYWORD);
  }
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

/** Ubah satu `body` laporan CSP menjadi `CspViolation` (atau null bila kosong). */
function toViolation(body: Record<string, unknown>): CspViolation | null {
  const directive = clamp(
    body["effective-directive"] ?? body["violated-directive"] ?? body["effectiveDirective"],
    60,
  );
  if (!directive) return null;
  const blocked = toOrigin(clamp(body["blocked-uri"] ?? body["blockedURL"]));
  const document = toOrigin(clamp(body["document-uri"] ?? body["documentURL"]));
  return { directive, blocked, document };
}

/**
 * Parse payload laporan CSP dari dua format yang lazim:
 * - `application/csp-report`: `{ "csp-report": { ... } }`
 * - `application/reports+json`: `[{ type, body: { ... } }]` (atau objek tunggal)
 *
 * Selalu mengembalikan array (mungkin kosong). Tak pernah melempar.
 */
export function parseCspReports(raw: unknown): CspViolation[] {
  const bodies: Record<string, unknown>[] = [];

  const push = (value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      bodies.push(value as Record<string, unknown>);
    }
  };

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === "object") {
        const rec = entry as Record<string, unknown>;
        if (rec["csp-report"]) push(rec["csp-report"]);
        else push(rec.body);
      }
    }
  } else if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>;
    if (rec["csp-report"]) push(rec["csp-report"]);
    else if (rec.body) push(rec.body);
    else push(rec);
  }

  const out: CspViolation[] = [];
  const seen = new Set<string>();
  for (const body of bodies) {
    const violation = toViolation(body);
    if (!violation) continue;
    const key = `${violation.directive}|${violation.blocked}|${violation.document}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(violation);
    if (out.length >= CSP_REPORT_MAX_ENTRIES) break;
  }
  return out;
}
