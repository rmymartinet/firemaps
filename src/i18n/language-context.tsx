"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "en" | "fr";

const LANGUAGE_STORAGE_KEY = "firemaps.language.v1";

type LanguageContextValue = {
  language: AppLanguage;
  locale: "en-GB" | "fr-FR";
  setLanguage: (language: AppLanguage) => void;
  tr: (french: string, english: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("fr");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "fr") setLanguageState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [hydrated, language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === "fr" ? "fr-FR" : "en-GB",
    setLanguage: setLanguageState,
    tr: (french, english) => language === "fr" ? french : english,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
