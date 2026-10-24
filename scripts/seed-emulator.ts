/**
 * Seed Firebase Emulator untuk E2E auth (OWNER/ADMIN/user biasa).
 *
 * Jalankan lewat `firebase emulators:exec` agar env host emulator tersedia:
 *   firebase emulators:exec --only auth,firestore --project lktech-emulator \
 *     "npm run seed:emulator"
 *
 * Script ini FAIL-CLOSED: menolak berjalan bila env emulator tidak ada, agar
 * tidak pernah menyentuh project produksi.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  E2E_ACCOUNTS,
  EMULATOR_PROJECT_ID,
  type EmulatorAccount,
} from "./emulator-fixtures.ts";

function assertEmulatorEnv(): void {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error(
      "FIREBASE_AUTH_EMULATOR_HOST kosong. Jalankan lewat `firebase emulators:exec`.",
    );
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST kosong. Jalankan lewat `firebase emulators:exec`.",
    );
  }
}

async function upsertUser(
  auth: ReturnType<typeof getAuth>,
  account: EmulatorAccount,
) {
  try {
    const existing = await auth.getUserByEmail(account.email);
    await auth.updateUser(existing.uid, {
      password: account.password,
      displayName: account.displayName,
      emailVerified: true,
    });
    return existing.uid;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (code !== "auth/user-not-found") throw err;
    const created = await auth.createUser({
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function main(): Promise<void> {
  assertEmulatorEnv();

  const app =
    getApps().find((a) => a.name === "lktech-emulator-seed") ??
    initializeApp({ projectId: EMULATOR_PROJECT_ID }, "lktech-emulator-seed");
  const auth = getAuth(app);
  const db = getFirestore(app);

  const owner = E2E_ACCOUNTS.owner;
  const admin = E2E_ACCOUNTS.admin;
  const user = E2E_ACCOUNTS.user;

  await upsertUser(auth, owner);
  await upsertUser(auth, admin);
  await upsertUser(auth, user);

  await db
    .collection("admins")
    .doc(admin.email)
    .set(
      {
        email: admin.email,
        name: admin.displayName,
        active: true,
        addedBy: owner.email,
        addedAtISO: new Date().toISOString(),
      },
      { merge: true },
    );

  // Fixture ADM-12: snapshot produk dengan harga lama, sedangkan dokumen
  // saat ini memakai harga baru. E2E restore harus mengembalikan harga lama.
  const stamp = "pre-restore-e2e";
  const productId = "e2e-restore-product";
  const createdAtISO = new Date().toISOString();
  const snapshotRow = {
    _id: productId,
    name: "Produk E2E Restore",
    slug: "produk-e2e-restore",
    price: 1000,
    active: true,
  };

  await db
    .collection("products")
    .doc(productId)
    .set(
      {
        name: snapshotRow.name,
        slug: snapshotRow.slug,
        price: 2000,
        active: true,
        updatedAtISO: createdAtISO,
      },
      { merge: true },
    );

  await db.collection("_backup_snapshots").doc(stamp).set({
    stamp,
    manifest: true,
    createdAtISO,
    sources: {
      products: { rows: 1, chunks: 1 },
    },
  });
  await db
    .collection("_backup_snapshots")
    .doc(`${stamp}__products__0`)
    .set({
      stamp,
      source: "products",
      chunk: 0,
      rows: [snapshotRow],
      createdAtISO,
    });

  console.log(
    `[seed-emulator] siap: OWNER=${owner.email} ADMIN=${admin.email} USER=${user.email}`,
  );
}

main()
  .then(() => {
    // Firebase Admin dapat meninggalkan handle gRPC/telemetry; CLI seed harus
    // benar-benar selesai agar `emulators:exec` tidak menggantung.
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed-emulator] gagal:", err);
    process.exit(1);
  });
