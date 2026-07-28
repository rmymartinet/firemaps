"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import englishMessages from "./messages/en.json";
import frenchMessages from "./messages/fr.json";
import spanishMessages from "./messages/es.json";
import italianMessages from "./messages/it.json";
import germanMessages from "./messages/de.json";
import portugueseMessages from "./messages/pt.json";
import dutchMessages from "./messages/nl.json";
import polishMessages from "./messages/pl.json";
import arabicMessages from "./messages/ar.json";

export type AppLanguage = "en" | "fr" | "es" | "it" | "de" | "pt" | "nl" | "pl" | "ar";

const LANGUAGE_STORAGE_KEY = "firemaps.language.v1";

type LanguageContextValue = {
  language: AppLanguage;
  locale: "en-GB" | "fr-FR" | "es-ES" | "it-IT" | "de-DE" | "pt-PT" | "nl-NL" | "pl-PL" | "ar";
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const messages = { en: englishMessages, fr: frenchMessages, es: spanishMessages, it: italianMessages, de: germanMessages, pt: portugueseMessages, nl: dutchMessages, pl: polishMessages, ar: arabicMessages } as const;

function messageFor(language: AppLanguage, key: string): string | null {
  const [namespace, messageKey] = key.split(".");
  if (!namespace || !messageKey) return null;
  const namespaceMessages = messages[language][namespace as keyof typeof messages[typeof language]];
  if (!namespaceMessages || typeof namespaceMessages !== "object") return null;
  const message = (namespaceMessages as Record<string, unknown>)[messageKey];
  if (typeof message === "string") return message;
  const fallback = messages.en[namespace as keyof typeof messages.en];
  if (!fallback || typeof fallback !== "object") return null;
  const fallbackMessage = (fallback as Record<string, unknown>)[messageKey];
  return typeof fallbackMessage === "string" ? fallbackMessage : null;
}

function interpolate(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, name) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder
  ));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "fr" || stored === "es" || stored === "it" || stored === "de" || stored === "pt" || stored === "nl" || stored === "pl" || stored === "ar") setLanguageState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [hydrated, language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : language === "pt" ? "pt-PT" : language === "nl" ? "nl-NL" : language === "pl" ? "pl-PL" : language === "ar" ? "ar" : "en-GB",
    setLanguage: setLanguageState,
    t: (key, values) => {
      const message = messageFor(language, key) ?? key;
      return values ? interpolate(message, values) : message;
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
