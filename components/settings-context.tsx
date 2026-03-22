"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SettingsContextValue {
  mediaEnabled: boolean;
  setMediaEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  mediaEnabled: true,
  setMediaEnabled: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [mediaEnabled, setMediaEnabled] = useState(true);

  return (
    <SettingsContext.Provider value={{ mediaEnabled, setMediaEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
