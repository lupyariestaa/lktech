/**
 * Logika form Pengaturan yang MURNI (fase P2) — bebas impor runtime agar dapat
 * diuji Node. Mencakup:
 * - Konversi `datetime-local` ↔ ISO dengan zona waktu yang BENAR (gap G10).
 * - Validasi klien per-field (gap G11).
 */

/* ============================================================
 * G10 — datetime-local ↔ ISO
 * ============================================================
 * Sebelumnya: `etaISO.slice(0, 16)` menampilkan waktu UTC sebagai jika lokal →
 * input `datetime-local` bergeser 5 jam (WIB). Konversi di bawah memakai waktu
 * LOKAL browser secara konsisten (dua arah).
 */

/**
 * Ubah ISO (UTC) → string untuk `<input type="datetime-local">` (`YYYY-MM-DDTHH:mm`)
 * dalam waktu LOKAL. Mengembalikan "" bila kosong/tidak valid.
 */
export function isoToLocalInput(iso: string | undefined | null): string {
  const raw = (iso ?? "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * Ubah nilai `<input type="datetime-local">` (waktu LOKAL) → ISO (UTC).
 * Mengembalikan "" bila kosong/tidak valid.
 */
export function localInputToIso(local: string | undefined | null): string {
  const raw = (local ?? "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/* ============================================================
 * G11 — validasi klien per-field
 * ============================================================ */

/** Peta error per-field: `path` → pesan. `path` memakai notasi titik. */
export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

/** Validasi email (opsional — kosong dianggap valid agar field boleh kosong). */
export function validateEmail(value: string, required = false): string | null {
  const v = value.trim();
  if (!v) return required ? "Email wajib diisi." : null;
  return EMAIL_RE.test(v) ? null : "Format email tidak valid (contoh: nama@email.com).";
}

/**
 * Validasi nomor WhatsApp (opsional). Menerima format lokal (08…) atau
 * internasional (628…). Digit 8–15 setelah normalisasi.
 */
export function validateWhatsapp(value: string): string | null {
  const v = value.replace(/[^\d]/g, "");
  if (!v) return null; // opsional
  const intl = v.startsWith("0") ? `62${v.slice(1)}` : v;
  if (intl.length < 8 || intl.length > 15) {
    return "Nomor WhatsApp tidak valid (contoh: 08123456789 atau 628123456789).";
  }
  return null;
}

/** Validasi URL http(s) (opsional). */
export function validateUrl(value: string, label = "URL"): string | null {
  const v = value.trim();
  if (!v) return null;
  return URL_RE.test(v) ? null : `${label} harus diawali http:// atau https://.`;
}

/** Validasi nilai `datetime-local` (opsional). */
export function validateDatetimeLocal(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return Number.isNaN(new Date(v).getTime())
    ? "Tanggal/waktu tidak valid."
    : null;
}

/** Input ringkas untuk validasi form pengaturan. */
export type SettingsFormInput = {
  email: string;
  whatsapp: string;
  socials: Array<{ label: string; href: string }>;
  seo?: { ogImage?: string };
  maintenance?: { etaISO?: string; contactEmail?: string; imageUrl?: string };
};

/**
 * Validasi seluruh form pengaturan. Mengembalikan peta error per-field
 * (kosong = valid). Path mengikuti lokasi field di form.
 */
export function validateSettingsForm(input: SettingsFormInput): FieldErrors {
  const errors: FieldErrors = {};

  const emailErr = validateEmail(input.email, true);
  if (emailErr) errors.email = emailErr;

  const waErr = validateWhatsapp(input.whatsapp);
  if (waErr) errors.whatsapp = waErr;

  input.socials.forEach((s, i) => {
    if (!s.href.trim() && !s.label.trim()) return; // baris kosong diabaikan
    if (!s.label.trim()) errors[`socials.${i}.label`] = "Label wajib diisi.";
    const hrefErr = validateUrl(s.href, "URL sosial");
    if (hrefErr) errors[`socials.${i}.href`] = hrefErr;
  });

  const ogErr = validateUrl(input.seo?.ogImage ?? "", "URL gambar OG");
  if (ogErr) errors["seo.ogImage"] = ogErr;

  const m = input.maintenance;
  if (m) {
    const imgErr = validateUrl(m.imageUrl ?? "", "URL gambar");
    if (imgErr) errors["maintenance.imageUrl"] = imgErr;
    const etaErr = validateDatetimeLocal(isoToLocalInput(m.etaISO));
    if (etaErr) errors["maintenance.etaISO"] = etaErr;
    const cErr = validateEmail(m.contactEmail ?? "");
    if (cErr) errors["maintenance.contactEmail"] = cErr;
  }

  return errors;
}

/** `true` bila tidak ada error. */
export function isFormValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
