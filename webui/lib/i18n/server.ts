import "server-only";

import { cookies } from "next/headers";
import { createTranslator, type TFunction } from "./index";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/**
 * The language for the current request: the visitor's cookie if they picked one,
 * otherwise the deployment default (`DEFAULT_LOCALE`, else English).
 *
 * Deliberately no `Accept-Language` sniffing — the choice has to survive as a stable,
 * shareable state, and a header-derived language would silently disagree with what
 * the switcher shows.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale();
}

/** Translator for a server component. */
export async function getT(): Promise<TFunction> {
  return createTranslator(await getLocale());
}
