/**
 * Utilitas CSV murni (aman untuk klien & test Node).
 *
 * Mitigasi CSV formula injection: Excel/Sheets dapat mengeksekusi sel yang
 * diawali `=`, `+`, `-`, `@`, tab, atau CR/LF. Nilai seperti itu diberi awalan
 * apostrof agar diperlakukan sebagai teks. Angka murni (termasuk negatif)
 * dibiarkan agar kolom nominal tetap bertipe angka.
 */

const FORMULA_PREFIX = /^[=+\-@\t\r\n]/;
const PURE_NUMBER = /^[+-]?\d+(?:[.,]\d+)?$/;

/** Bungkus satu nilai sebagai sel CSV yang aman. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (FORMULA_PREFIX.test(s) && !PURE_NUMBER.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}
