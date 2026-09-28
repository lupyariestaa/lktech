const DEFAULT_NUMBER = "6281234567890";

/**
 * Membuat link WhatsApp (deep link wa.me) dengan pesan otomatis.
 * @param message Pesan yang otomatis terisi di chat.
 * @param number Nomor tujuan (format internasional tanpa +, mis. 62812...).
 */
export function waLink(message?: string, number?: string) {
  const phone = (number ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? DEFAULT_NUMBER).replace(
    /\D/g,
    "",
  );
  const base = `https://wa.me/${phone}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WA_MESSAGES = {
  general:
    "Halo LKTech! Saya tertarik dengan layanan Anda dan ingin berkonsultasi seputar kebutuhan digital bisnis saya.",
  website:
    "Halo LKTech! Saya tertarik membuat website. Boleh dibantu konsultasi lebih lanjut?",
  mobile:
    "Halo LKTech! Saya tertarik membuat aplikasi mobile. Boleh dibantu konsultasi lebih lanjut?",
  consultant:
    "Halo LKTech! Saya ingin konsultasi teknologi untuk bisnis saya. Boleh dibantu?",
  pricing:
    "Halo LKTech! Saya ingin bertanya mengenai paket layanan dan estimasi biaya. Terima kasih!",
} as const;
