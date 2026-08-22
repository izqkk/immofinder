"use client";

import * as React from "react";
import { createTranslator, type TFunction } from "./index";
import type { Locale } from "./locales";

const LocaleContext = React.createContext<Locale | null>(null);

/**
 * Carries the request's locale into client components.
 *
 * Only the locale crosses the boundary, not the dictionary: both dictionaries are in
 * the client bundle anyway (they are plain modules), and serialising one per render
 * would bloat every RSC payload for no gain.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  const locale = React.useContext(LocaleContext);
  if (!locale) throw new Error("useLocale must be used inside <I18nProvider>");
  return locale;
}

/** Translator for a client component. Memoised so it stays referentially stable. */
export function useT(): TFunction {
  const locale = useLocale();
  return React.useMemo(() => createTranslator(locale), [locale]);
}
