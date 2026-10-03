"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getIdToken } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";

type AccountStatus = {
  /** Profil user sedang dimuat. */
  loading: boolean;
  /** User diblokir admin (tidak boleh bertransaksi). */
  blocked: boolean;
  /** Muat ulang status (mis. setelah login / aksi). */
  refresh: () => Promise<void>;
};

const AccountStatusContext = createContext<AccountStatus>({
  loading: true,
  blocked: false,
  refresh: async () => {},
});

/**
 * Menyediakan status akun (khususnya `blocked`) ke seluruh aplikasi.
 *
 * Memuat profil user sekali saat login (endpoint yang sama dipakai halaman
 * akun). Dipakai untuk: banner "akun diblokir" & menonaktifkan aksi transaksi
 * di UI (checkout, tambah keranjang, wishlist, alamat). Enforcement utama tetap
 * di server (`requireActiveUser`).
 */
export function AccountStatusProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setBlocked(false);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setBlocked(Boolean(data?.profile?.blocked));
      }
    } catch {
      /* best-effort */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    (async () => {
      if (!user) {
        if (active) {
          setBlocked(false);
          setLoading(false);
        }
        return;
      }
      await load();
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading, load]);

  const refresh = useCallback(async () => {
    if (!user) return;
    await load();
  }, [user, load]);

  const value = useMemo<AccountStatus>(
    () => ({ loading, blocked, refresh }),
    [loading, blocked, refresh],
  );

  return (
    <AccountStatusContext.Provider value={value}>
      {children}
    </AccountStatusContext.Provider>
  );
}

export function useAccountStatus(): AccountStatus {
  return useContext(AccountStatusContext);
}
