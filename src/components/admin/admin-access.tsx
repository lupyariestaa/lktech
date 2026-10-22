"use client";

import { createContext, useContext } from "react";

export type AdminAccess = {
  email: string;
  isOwner: boolean;
};

const DEFAULT_ACCESS: AdminAccess = { email: "", isOwner: false };

const AdminAccessContext = createContext<AdminAccess>(DEFAULT_ACCESS);

/** Menyediakan hasil verifikasi `/api/admin/me` ke seluruh UI admin. */
export function AdminAccessProvider({
  value,
  children,
}: {
  value: AdminAccess;
  children: React.ReactNode;
}) {
  return (
    <AdminAccessContext.Provider value={value}>
      {children}
    </AdminAccessContext.Provider>
  );
}

/**
 * Role dashboard 2 tingkat:
 * - OWNER (env `ADMIN_EMAILS`): semua aksi, termasuk backup & kelola admin.
 * - ADMIN (DB `admins/{email}`): operasional harian; tanpa backup, ekspor PII
 *   massal, hapus permanen, atau kelola admin.
 *
 * Default `isOwner:false` adalah fail-safe untuk komponen yang dirender di
 * luar provider (mis. test/storybook).
 */
export function useAdminAccess(): AdminAccess {
  return useContext(AdminAccessContext);
}
