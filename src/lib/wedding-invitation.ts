/** Stable product identifier shared by the catalog seed and paid-order flow. */
export const WEDDING_INVITATION_PRODUCT_SLUG = "undangan-pernikahan-digital";

export type WeddingInvitationOrder = {
  id: string;
  buyerName: string;
  buyerEmail: string;
};

/** Only show post-purchase follow-up for a paid invitation order. */
export function canSendWeddingInvitationDetails(order: {
  items: Array<{ slug: string }>;
  status: string;
  payment?: { status?: string } | null;
}): boolean {
  return (
    order.items.some((item) => item.slug === WEDDING_INVITATION_PRODUCT_SLUG) &&
    order.payment?.status === "dibayar" &&
    ["dibayar", "diproses", "selesai"].includes(order.status)
  );
}

/** Build the prefilled WhatsApp message sent after an invitation order is paid. */
export function buildWeddingInvitationWhatsAppMessage(
  order: WeddingInvitationOrder,
): string {
  return [
    "Halo LKTech, pembayaran undangan pernikahan digital saya sudah selesai.",
    "",
    `Kode pesanan: ${order.id}`,
    `Nama pemesan: ${order.buyerName || "(silakan isi)"}`,
    `Email: ${order.buyerEmail || "(silakan isi)"}`,
    "",
    "Mohon kirimkan tautan demo template undangan yang tersedia. Setelah menerima demo, saya akan memilih template dan melengkapi data berikut:",
    "",
    "PILIHAN TEMPLATE (diisi setelah menerima tautan demo):",
    "",
    "DATA MEMPELAI",
    "1. Nama lengkap mempelai pria:",
    "2. Nama panggilan mempelai pria:",
    "3. Nama orang tua mempelai pria:",
    "4. Nama lengkap mempelai wanita:",
    "5. Nama panggilan mempelai wanita:",
    "6. Nama orang tua mempelai wanita:",
    "7. Tanggal dan waktu akad:",
    "8. Lokasi/alamat akad:",
    "9. Tanggal dan waktu resepsi:",
    "10. Lokasi/alamat resepsi:",
    "11. Tautan Google Maps lokasi acara:",
    "12. Nomor WhatsApp untuk RSVP:",
    "13. Cerita singkat kedua mempelai (opsional):",
    "14. Kutipan/doa yang ingin dicantumkan (opsional):",
    "15. Rekening/e-wallet untuk hadiah (opsional):",
    "16. Tautan foto atau folder foto (opsional):",
    "17. Catatan tambahan:",
    "",
    "Terima kasih.",
  ].join("\n");
}
