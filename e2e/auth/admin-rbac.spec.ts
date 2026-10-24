import { expect, test, request as playwrightRequest } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  E2E_ACCOUNTS,
  E2E_ADMIN_SESSION_SECRET,
  EMULATOR_PROJECT_ID,
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

/** Firestore emulator untuk assertion data setelah restore. Fail-closed. */
function emulatorDb() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST kosong; E2E bukan mode emulator.");
  }
  const app =
    getApps().find((candidate) => candidate.name === "lktech-e2e-auth-test") ??
    initializeApp({ projectId: EMULATOR_PROJECT_ID }, "lktech-e2e-auth-test");
  return getFirestore(app);
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

test("backup snapshot: 401/403 dan OWNER boleh melihat daftar", async ({
  request,
}) => {
  const noToken = await request.get("/api/admin/backup/snapshots");
  expect(noToken.status()).toBe(401);

  const user = await signInEmulator(request, E2E_ACCOUNTS.user);
  const userDenied = await request.get("/api/admin/backup/snapshots", {
    headers: bearer(user.idToken),
  });
  expect(userDenied.status()).toBe(403);

  const admin = await signInEmulator(request, E2E_ACCOUNTS.admin);
  const adminDenied = await request.get("/api/admin/backup/snapshots", {
    headers: bearer(admin.idToken),
  });
  expect(adminDenied.status()).toBe(403);
  const adminStartDenied = await request.post("/api/admin/backup/snapshots", {
    headers: bearer(admin.idToken),
    data: { stamp: "pre-restore-test" },
  });
  expect(adminStartDenied.status()).toBe(403);

  const owner = await signInEmulator(request, E2E_ACCOUNTS.owner);
  const ownerList = await request.get("/api/admin/backup/snapshots", {
    headers: bearer(owner.idToken),
  });
  expect(ownerList.status()).toBe(200);
  const body = (await ownerList.json()) as {
    ok: boolean;
    snapshots: unknown[];
    activeJob: unknown;
  };
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.snapshots)).toBe(true);

  // Body kosong → 400 (bukan 403): guard fresh OWNER lolos.
  const badStart = await request.post("/api/admin/backup/snapshots", {
    headers: bearer(owner.idToken),
    data: {},
  });
  expect(badStart.status()).toBe(400);
});

test("OWNER: restore snapshot bertahap benar-benar menulis data", async ({
  request,
}) => {
  const owner = await signInEmulator(request, E2E_ACCOUNTS.owner);

  const start = await request.post("/api/admin/backup/snapshots", {
    headers: bearer(owner.idToken),
    data: { stamp: "pre-restore-e2e" },
  });
  expect(start.status()).toBe(200);
  let job = ((await start.json()) as {
    job: { id: string; status: string; written: number; failed: number };
  }).job;

  for (let i = 0; i < 12; i += 1) {
    if (job.status === "completed" || job.status === "failed") break;
    const step = await request.post(
      `/api/admin/backup/snapshots/${job.id}`,
      { headers: bearer(owner.idToken) },
    );
    expect(step.status()).toBe(200);
    job = ((await step.json()) as {
      job: { id: string; status: string; written: number; failed: number };
    }).job;
  }

  expect(job.status).toBe("completed");
  expect(job.failed).toBe(0);
  expect(job.written).toBeGreaterThanOrEqual(1);

  const doc = await emulatorDb()
    .collection("products")
    .doc("e2e-restore-product")
    .get();
  expect(doc.exists).toBe(true);
  expect(doc.data()?.price).toBe(1000);
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
