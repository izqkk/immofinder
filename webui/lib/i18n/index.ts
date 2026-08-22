import type { Dictionary } from "./dictionaries";
import { dictionaries } from "./dictionaries";
import type { Locale } from "./locales";

export type { Dictionary } from "./dictionaries";
export type { Locale } from "./locales";
export { LOCALES, LOCALE_NAMES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, defaultLocale } from "./locales";

/**
 * Every dotted path in the dictionary that resolves to a string — `"nav.items.home"`,
 * `"settings.tabs.scoring"`, and so on. Mistyping a key is a compile error, which is
 * the whole point of keeping the dictionary a literal object instead of a map.
 */
export type TranslationKey<T = Dictionary> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${TranslationKey<T[K]>}`;
    }[keyof T & string];

/** Values interpolated into `{placeholder}` slots. */
export type TranslationVars = Record<string, string | number>;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * Resolve a key against a dictionary.
 *
 * Falls back to the key itself when a lookup misses. That cannot happen for keys
 * typed as `TranslationKey`, but `t` is also handed runtime-built keys (score
 * reasons, provider labels), and a visible key beats an empty label or a crash.
 */
export function translate(dict: Dictionary, key: string, vars?: TranslationVars): string {
  const template = lookup(dict, key);
  return template === undefined ? key : interpolate(template, vars);
}

/**
 * Pick between the `.one` and `.other` variants of a key based on `count`, and make
 * `{count}` available to both. Only English and German are supported, and both share
 * the same one/other split, so a full CLDR plural-rule table would be dead weight.
 */
export function pluralize(
  dict: Dictionary,
  key: string,
  count: number,
  vars?: TranslationVars,
): string {
  const variant = count === 1 ? `${key}.one` : `${key}.other`;
  return translate(dict, variant, { count, ...vars });
}

/** The translation function handed to components. */
export type TFunction = {
  (key: TranslationKey, vars?: TranslationVars): string;
  /**
   * Untyped lookup, for a key that only exists as a value at the call site — the
   * reason keys `lib/score.ts` returns, or the error key a server action hands back.
   */
  raw: (key: string, vars?: TranslationVars) => string;
  plural: (key: TranslationKey | string, count: number, vars?: TranslationVars) => string;
  locale: Locale;
};

export function createTranslator(locale: Locale): TFunction {
  const dict = getDictionary(locale);
  const t = ((key: TranslationKey, vars?: TranslationVars) =>
    translate(dict, key, vars)) as TFunction;
  t.raw = (key, vars) => translate(dict, key, vars);
  t.plural = (key, count, vars) => pluralize(dict, key as string, count, vars);
  t.locale = locale;
  return t;
}
