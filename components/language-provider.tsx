"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type TranslationKey, translate } from "@/lib/i18n";

const KEY = "second-opinion-language";
type LanguageContextValue = { language: AppLanguage; ready: boolean; setLanguage: (language: AppLanguage) => void; t: (key: TranslationKey, values?: Record<string, string | number>) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setState] = useState<AppLanguage>("en");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    const detected: AppLanguage = saved === "vi" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
    document.documentElement.lang = detected;
    const timer = window.setTimeout(() => { setState(detected); setReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const setLanguage = useCallback((next: AppLanguage) => {
    setState(next); window.localStorage.setItem(KEY, next); document.documentElement.lang = next;
  }, []);
  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values), [language]);
  const value = useMemo(() => ({ language, ready, setLanguage, t }), [language, ready, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
