/**
 * Diagnostik MURNI domain pengirim Resend (F-14) — bebas impor runtime agar
 * dapat diuji Node tanpa alias resolver.
 *
 * Latar: bila `EMAIL_FROM` memakai domain yang belum terverifikasi di Resend,
 * setiap email ke pembeli ditolak `403` dan pembeli tidak pernah menerima
 * konfirmasi/pautan unduhan. Modul ini menerjemahkan konfigurasi + daftar
 * domain Resend menjadi satu putusan yang bisa ditampilkan ke admin.
 *
 * TIDAK pernah menyentuh jaringan atau rahasia — hanya data publik
 * (alamat pengirim & nama/status domain).
 */

/** Satu domain dari `GET https://api.resend.com/domains` (subset aman). */
export type ResendDomainRecord = {
  name: string;
  status: string;
};

export type SendingDomainVerdict =
  /** Domain terverifikasi → email bisa dikirim ke semua alamat. */
  | "ready"
  /** Memakai `resend.dev` → hanya alamat pemilik akun Resend yang menerima. */
  | "test_only"
  /** Domain pada `EMAIL_FROM` belum ditambahkan ke akun Resend. */
  | "not_found"
  /** Domain terdaftar tetapi verifikasi DNS belum selesai. */
  | "pending"
  /** Verifikasi domain gagal (record DNS salah/kadaluwarsa). */
  | "failed"
  /** Tidak dapat diperiksa (API key tanpa izin `domains`, jaringan, dll). */
  | "unknown";

export type SendingDomainHealth = {
  /** `EMAIL_FROM` mentah (boleh berformat `Nama <alamat@domain>`). */
  from: string;
  /** Domain dari alamat pengirim (huruf kecil), atau `null`. */
  fromDomain: string | null;
  /** `true` bila memakai domain uji Resend. */
  testOnly: boolean;
  verdict: SendingDomainVerdict;
  /** Nama domain yang cocok di akun Resend (bila ada). */
  domainName?: string;
  /** Status mentah Resend (`verified`/`pending`/...) bila ada. */
  domainStatus?: string;
  /** Penjelasan siap-tampil untuk admin (tanpa rahasia). */
  message: string;
};

/** Ambil alamat email dari string `Nama <alamat@domain>` atau alamat telanjang. */
export function parseEmailAddress(from: string): string | null {
  const value = (from ?? "").trim();
  if (!value) return null;
  const angle = value.match(/<([^>]+)>/);
  const candidate = (angle ? angle[1] : value).trim();
  // Sengaja longgar: cukup mengandung "@" dengan bagian lokal & domain.
  return /^[^\s@]+@[^\s@]+$/.test(candidate) ? candidate : null;
}

/** Domain (huruf kecil) dari sebuah alamat email, atau `null`. */
export function emailDomainOf(address: string | null): string | null {
  if (!address) return null;
  const at = address.lastIndexOf("@");
  if (at < 0) return null;
  const domain = address.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

/** Apakah domain adalah domain uji Resend (`resend.dev` beserta subdomain). */
export function isResendTestDomain(domain: string | null): boolean {
  if (!domain) return false;
  return domain === "resend.dev" || domain.endsWith(".resend.dev");
}

/**
 * Putuskan kesiapan domain pengirim.
 *
 * `domainsAvailable = false` berarti daftar domain TIDAK berhasil diambil
 * (mis. API key hanya boleh mengirim). Itu bukan berarti domain tak terverifikasi
 * — karena itu hasilnya `unknown`, bukan `not_found`.
 */
export function evaluateSendingDomain(input: {
  from: string;
  domains: readonly ResendDomainRecord[];
  domainsAvailable: boolean;
}): SendingDomainHealth {
  const address = parseEmailAddress(input.from);
  const fromDomain = emailDomainOf(address);
  const testOnly = isResendTestDomain(fromDomain);
  const base = { from: input.from, fromDomain, testOnly };

  if (!address) {
    return {
      ...base,
      verdict: "unknown",
      message:
        "EMAIL_FROM tidak berisi alamat email yang valid. Gunakan format \"Nama <alamat@domain>\".",
    };
  }

  if (testOnly) {
    return {
      ...base,
      verdict: "test_only",
      message:
        `Pengirim memakai domain uji Resend (${fromDomain}). Email hanya sampai ke alamat ` +
        "pemilik akun Resend — pembeli umum TIDAK menerima. Verifikasi domain Anda di " +
        "dashboard Resend, lalu ubah EMAIL_FROM ke alamat domain terverifikasi itu.",
    };
  }

  if (!input.domainsAvailable) {
    return {
      ...base,
      verdict: "unknown",
      message:
        "Status domain tidak dapat diperiksa otomatis (izin API key atau jaringan). " +
        "Periksa Domain di dashboard Resend secara manual.",
    };
  }

  const match = input.domains.find(
    (d) => typeof d.name === "string" && d.name.trim().toLowerCase() === fromDomain,
  );

  if (!match) {
    const known = input.domains
      .map((d) => d.name.trim())
      .filter(Boolean)
      .slice(0, 5);
    const hint =
      known.length > 0
        ? ` Domain terdaftar di akun: ${known.join(", ")}.`
        : " Belum ada domain terdaftar di akun Resend.";
    return {
      ...base,
      verdict: "not_found",
      message:
        `Domain ${fromDomain} belum terdaftar/terverifikasi di akun Resend — email ke ` +
        `pembeli akan ditolak (403). Tambahkan domain ini di Resend, atau ubah EMAIL_FROM.${hint}`,
    };
  }

  const status = (match.status ?? "").trim().toLowerCase();
  const domainName = match.name.trim();

  if (status === "verified") {
    return {
      ...base,
      verdict: "ready",
      domainName,
      domainStatus: match.status,
      message: `Domain ${domainName} terverifikasi — email bisa dikirim ke semua alamat.`,
    };
  }

  if (status === "failed") {
    return {
      ...base,
      verdict: "failed",
      domainName,
      domainStatus: match.status,
      message:
        `Verifikasi domain ${domainName} GAGAL. Periksa record DNS (SPF/DKIM) di ` +
        "dashboard Resend lalu verifikasi ulang.",
    };
  }

  return {
    ...base,
    verdict: "pending",
    domainName,
    domainStatus: match.status || "pending",
    message:
      `Domain ${domainName} terdaftar tetapi belum terverifikasi ` +
      `(status: ${match.status || "pending"}). Lengkapi record DNS di dashboard Resend.`,
  };
}