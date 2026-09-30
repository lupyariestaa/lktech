"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type SiteSettings,
} from "@/lib/settings-types";

const SettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS);

/**
 * Menyediakan pengaturan situs (kontak) ke komponen client.
 *
 * Pengaturan awal diberikan dari server (root layout via `getSiteSettings()`)
 * sehingga sudah SEGAR per-request. Refetch dari `/api/settings` hanya dilakukan
 * bila server tidak menyediakan `initial` (mis. dipakai di luar layout). Ini
 * mengikuti pola `ContentProvider` dan menghindari bug "data basi" yang menimpa
 * data segar dari server dengan hasil fetch yang mungkin lebih lama.
 */
export function SettingsProvider({
  initial,
  children,
}: {
  initial?: SiteSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<SiteSettings>(
    initial ?? DEFAULT_SETTINGS,
  );

  useEffect(() => {
    // Bila server sudah mengirim pengaturan (`initial`), jangan refetch &
    // jangan timpa — nilai state sudah diinisialisasi dari `initial` saat mount,
    // dan SSR lebih segar. Hanya fetch bila tidak ada `initial` (mis. dipakai
    // di luar layout). Ini mengikuti pola `ContentProvider` & menghindari bug
    // "data basi" yang menimpa data segar server dengan hasil fetch lama.
    if (initial) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.settings) setSettings(data.settings);
      } catch {
        /* pakai default */
      }
    })();
    return () => {
      active = false;
    };
  }, [initial]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
