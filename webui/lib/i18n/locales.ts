/**
 * Supported UI languages.
 *
 * English is the source of truth: `dictionaries/en` defines the shape, every other
 * locale is type-checked against it, so a missing translation is a build error
 * rather than a blank label at runtime.
 */
export const LOCALES = ["en", "de"] as const;

export type Locale = (typeof LOCALES)[number];

/** Human-readable names, shown in the language switcher (each in its own language). */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

/**
 * Cookie the chosen language is stored in. Not `httpOnly`: it carries no authority,
 * and the client toggle reads it back to render the correct state before the server
 * round-trip completes.
 */
export const LOCALE_COOKIE = "immofinder_locale";

/** One year — long enough that returning users never see the wrong language twice. */
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Fallback when no cookie is set. Operators can point a whole deployment at German
 * via `DEFAULT_LOCALE=de` without touching code; an unknown value falls back to
 * English rather than breaking the render.
 */
export function defaultLocale(): Locale {
  const configured = process.env.DEFAULT_LOCALE;
  return isLocale(configured) ? configured : "en";
}
