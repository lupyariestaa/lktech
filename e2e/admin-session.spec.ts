import { test, expect } from "@playwright/test";

/**
 * Regresi ADM-04 — logout tanpa sesi tetap aman:
 * cookie dibersihkan, endpoint tidak 500, dan tidak ada klaim revocation palsu.
 */
test("logout tanpa sesi menghapus cookie dan mengembalikan revoked=false", async ({
  request,
}) => {
  const res = await request.delete("/api/admin/session");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.revoked).toBe(false);

  const setCookie = res.headers()["set-cookie"] ?? "";
  expect(setCookie).toContain("__session=");
  expect(setCookie.toLowerCase()).toContain("max-age=0");
});
