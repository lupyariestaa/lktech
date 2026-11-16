import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs an explicit extension.
import { buildWeddingInvitationWhatsAppMessage, canSendWeddingInvitationDetails, WEDDING_INVITATION_PRODUCT_SLUG } from "../src/lib/wedding-invitation.ts";

test("undangan pernikahan punya slug stabil untuk katalog dan pesanan", () => {
  assert.equal(WEDDING_INVITATION_PRODUCT_SLUG, "undangan-pernikahan-digital");
});

test("pesan WhatsApp menyertakan kode pesanan, permintaan demo, dan formulir lengkap", () => {
  const message = buildWeddingInvitationWhatsAppMessage({
    id: "ORDER-123",
    buyerName: "Ayu",
    buyerEmail: "ayu@example.com",
  });

  assert.match(message, /Kode pesanan: ORDER-123/);
  assert.match(message, /Mohon kirimkan tautan demo template/);
  assert.match(message, /PILIHAN TEMPLATE/);
  assert.match(message, /Nama lengkap mempelai pria/);
  assert.match(message, /Nama orang tua mempelai wanita/);
  assert.match(message, /Tautan Google Maps lokasi acara/);
  assert.match(message, /Rekening\/e-wallet/);
  assert.match(message, /Tautan foto atau folder foto/);
});

test("follow-up WhatsApp hanya tersedia untuk undangan yang benar-benar lunas", () => {
  const invitation = {
    items: [{ slug: WEDDING_INVITATION_PRODUCT_SLUG }],
    status: "dibayar",
    payment: { status: "dibayar" },
  };

  assert.equal(canSendWeddingInvitationDetails(invitation), true);
  assert.equal(
    canSendWeddingInvitationDetails({ ...invitation, payment: { status: "menunggu" } }),
    false,
  );
  assert.equal(
    canSendWeddingInvitationDetails({ ...invitation, status: "dibatalkan" }),
    false,
  );
  assert.equal(
    canSendWeddingInvitationDetails({ ...invitation, items: [{ slug: "produk-lain" }] }),
    false,
  );
});
