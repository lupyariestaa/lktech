import { test, expect } from "@playwright/test";

/**
 * Regresi header keamanan (ADM-05).
 * Dijalankan terhadap build produksi (`npm run test:e2e`).
 */
test("header proteksi clickjacking, CSP minimal, dan HSTS", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);

  const headers = res.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("base-uri 'self'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  // CSP penuh masih report-only (ADM-05) — tidak boleh memblokir apa pun.
  expect(headers["content-security-policy-report-only"]).toContain(
    "default-src 'self'",
  );
  expect(headers["content-security-policy-report-only"]).toContain(
    "connect-src 'self'",
  );
  expect(headers["strict-transport-security"]).toContain("max-age=31536000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});
