import { expect, test, request as playwrightRequest } from "@playwright/test";
import {
  E2E_ACCOUNTS,
  E2E_ADMIN_SESSION_SECRET,
} from "../../scripts/emulator-fixtures";
import {
  bearer,
  cookieHeader,
  cookieValue,
  createShortSessionCookie,
  makeLoginCookie,
  rawGet,
  signInEmulator,
} from "./helpers";

test.describe.configure({ mode: "serial" });

function expectLoginRedirect(res: {
  status: number;
  location: string | null;
  body: string;
}): void {
  if (res.status === 307) {
    expect(res.location).toContain("/admin/login");
    return;
  }
  // Next 16 dapat menstream shell lebih dulu lalu mengirim redirect RSC
  // (HTTP 200 + payload NEXT_REDIRECT). Yang penting: guard server menolak.
  expect(res.status).toBe(200);
  expect(res.body).toContain("NEXT_REDIRECT");
  expect(res.body).toContain("/admin/login");
}

test("tanpa token: /api/admin/me → 401", async ({ request }) => {
  const res = await request.get("/api/admin/me");
  expect(res.status()).toBe(401);
});

test("user biasa: /api/admin/me → 403", async ({ request }) => {
  const user = await signInEmulator(request, E2E_ACCOUNTS.user);
  const res = await request.get("/api/admin/me", {
    headers: bearer(user.idToken),
  });
  expect(res.status()).toBe(403);
});

test("ADMIN: role ADMIN dan tidak boleh aksi OWNER-only", async ({ request }) => {
  const admin = await signInEmulator(request, E2E_ACCOUNTS.admin);

  const me = await request.get("/api/admin/me", {
    headers: bearer(admin.idToken),
  });
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({
    ok: true,
    email: E2E_ACCOUNTS.admin.email,
    isOwner: false,
    role: "ADMIN",
  });

  // OWNER-only: ADMIN harus ditolak sebelum body divalidasi.
  const denied = await request.post("/api/admin/admins", {
    headers: bearer(admin.idToken),
    data: {},
  });
  expect(denied.status()).toBe(403);
});

test("OWNER: role OWNER dan lolos gate OWNER-only", async ({ request }) => {
  const owner = await signInEmulator(request, E2E_ACCOUNTS.owner);

  const me = await request.get("/api/admin/me", {
    headers: bearer(owner.idToken),
  });
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({
    ok: true,
    email: E2E_ACCOUNTS.owner.email,
    isOwner: true,
    role: "OWNER",
  });

  // Body kosong → 400, bukan 403: membuktikan guard OWNER lolos.
  const badBody = await request.post("/api/admin/admins", {
    headers: bearer(owner.idToken),
    data: {},
  });
  expect(badBody.status()).toBe(400);
});

test("session cookie: login, gate /admin, dan absolute timeout", async () => {
  const baseURL = String(test.info().project.use.baseURL);
  const api = await playwrightRequest.newContext({ baseURL });
  let session = "";
  let loginCookie = "";
  let uid = "";

  try {
    const owner = await signInEmulator(api, E2E_ACCOUNTS.owner);
    uid = owner.uid;
    const login = await api.post("/api/admin/session", {
      headers: bearer(owner.idToken),
    });
    expect(login.status()).toBe(200);

    const headers = login.headers();
    session = cookieValue(headers, "__session") ?? "";
    loginCookie = cookieValue(headers, "__admin_login") ?? "";
    expect(session).toBeTruthy();
    expect(loginCookie).toBeTruthy();
    expect(headers["set-cookie"]).toContain("HttpOnly");
    expect(headers["set-cookie"]).toContain("Max-Age=3600");
  } finally {
    await api.dispose();
  }

  const noCookie = await rawGet(`${baseURL}/admin`);
  expect(noCookie.status).toBe(307);
  expect(noCookie.location).toContain("/admin/login");

  const ok = await rawGet(
    `${baseURL}/admin`,
    cookieHeader({ __session: session, __admin_login: loginCookie }),
  );
  expect(ok.status).toBe(200);
  expect(ok.body).toContain("Ringkasan");

  // Absolute timeout 12 jam: cookie login bertanda tangan yang sudah basi
  // harus ditolak layout server meski session cookie Firebase masih valid.
  const stale = makeLoginCookie(
    uid,
    Date.now() - 13 * 60 * 60 * 1000,
    E2E_ADMIN_SESSION_SECRET,
  );
  const expired = await rawGet(
    `${baseURL}/admin`,
    cookieHeader({ __session: session, __admin_login: stale }),
  );
  expectLoginRedirect(expired);
});

test("session cookie: idle expiry (cookie pendek) ditolak", async () => {
  const baseURL = String(test.info().project.use.baseURL);
  const api = await playwrightRequest.newContext({ baseURL });
  let shortSession = "";
  let loginCookie = "";

  try {
    const owner = await signInEmulator(api, E2E_ACCOUNTS.owner);
    shortSession = await createShortSessionCookie(owner.idToken, 1);
    loginCookie = makeLoginCookie(owner.uid, Date.now());
  } finally {
    await api.dispose();
  }

  await new Promise((resolve) => setTimeout(resolve, 1800));

  const res = await rawGet(
    `${baseURL}/admin`,
    cookieHeader({
      __session: shortSession,
      __admin_login: loginCookie,
    }),
  );
  expectLoginRedirect(res);
});

test("logout ADMIN mencabut token lama (401)", async ({ request }) => {
  const admin = await signInEmulator(request, E2E_ACCOUNTS.admin);
  // Revocation Firebase beresolusi detik. Beri jeda agar `validSince` lebih
  // baru dari `auth_time`/`iat` token yang baru dibuat.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const logout = await request.delete("/api/admin/session", {
    headers: bearer(admin.idToken),
  });
  expect(logout.status()).toBe(200);
  expect(await logout.json()).toMatchObject({ ok: true, revoked: true });

  const after = await request.get("/api/admin/me", {
    headers: bearer(admin.idToken),
  });
  expect(after.status()).toBe(401);
});
