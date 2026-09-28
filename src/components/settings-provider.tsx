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
 * Nilai awal = default, lalu disinkronkan dari /api/settings.
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
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings");
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
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
