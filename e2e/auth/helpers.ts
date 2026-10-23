import { createHmac } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import {
  E2E_ADMIN_SESSION_SECRET,
  EMULATOR_AUTH_HOST,
  EMULATOR_PROJECT_ID,
  type EmulatorAccount,
} from "../../scripts/emulator-fixtures";

export type SignedInAccount = {
  uid: string;
  email: string;
  idToken: string;
};

/** Login langsung ke Firebase Auth Emulator (tanpa UI Google popup). */
export async function signInEmulator(
  request: APIRequestContext,
  account: EmulatorAccount,
): Promise<SignedInAccount> {
  const res = await request.post(
    `http://${EMULATOR_AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`,
    {
      data: {
        email: account.email,
        password: account.password,
        returnSecureToken: true,
      },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `Login emulator gagal untuk ${account.email}: ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { idToken?: string; localId?: string };
  if (!body.idToken || !body.localId) {
    throw new Error(`Respons login emulator tidak lengkap untuk ${account.email}.`);
  }
  return {
    uid: body.localId,
    email: account.email,
    idToken: body.idToken,
  };
}

export function bearer(idToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${idToken}` };
}

/** Ambil nilai satu cookie dari header `set-cookie` respons. */
export function cookieValue(
  headers: Record<string, string>,
  name: string,
): string | null {
  const raw = headers["set-cookie"] ?? "";
  const match = raw.match(new RegExp(`(?:^|[,\\s])${name}=([^;]+)`));
  return match?.[1] ?? null;
}

export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

/** GET mentah tanpa cookie jar, agar header Cookie yang diuji persis terkirim. */
export async function rawGet(
  url: string,
  cookie?: string,
): Promise<{
  status: number;
  location: string | null;
  cacheControl: string | null;
  nextCache: string | null;
  body: string;
}> {
  const res = await fetch(url, {
    headers: cookie ? { cookie } : undefined,
    redirect: "manual",
  });
  return {
    status: res.status,
    location: res.headers.get("location"),
    cacheControl: res.headers.get("cache-control"),
    nextCache: res.headers.get("x-nextjs-cache"),
    body: await res.text(),
  };
}

/** Meniru format `createAdminLoginToken` (HMAC base64url). */
export function makeLoginCookie(
  uid: string,
  loginAt: number,
  secret = E2E_ADMIN_SESSION_SECRET,
): string {
  const payload = Buffer.from(JSON.stringify({ uid, loginAt }), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Membuat session cookie Firebase berumur pendek lewat REST emulator.
 *
 * Emulator (dan Admin SDK) membatasi `validDuration` minimal 5 menit. Session
 * cookie emulator memakai JWT unsigned (`alg: none`), jadi setelah cookie dibuat
 * kita menulis ulang `exp` menjadi 1 detik tanpa menunggu 5 menit. Ini hanya
 * untuk E2E emulator; produksi tetap memakai `createSessionCookie` Admin SDK.
 */
export async function createShortSessionCookie(
  idToken: string,
  ttlSeconds = 1,
): Promise<string> {
  const res = await fetch(
    `http://${EMULATOR_AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${EMULATOR_PROJECT_ID}:createSessionCookie?key=demo-api-key`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Emulator menerima token "owner" untuk operasi project-level.
        authorization: "Bearer owner",
      },
      body: JSON.stringify({ idToken, validDuration: "300" }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `createSessionCookie emulator gagal: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { sessionCookie?: string };
  if (!body.sessionCookie) {
    throw new Error("createSessionCookie emulator tidak mengembalikan cookie.");
  }

  const [header, payload] = body.sessionCookie.split(".");
  if (!header || !payload) {
    throw new Error("Format session cookie emulator tidak dikenali.");
  }
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  claims.exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const shortPayload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  return `${header}.${shortPayload}.`;
}
