import type { TFunction } from "./index";
import type { Locale } from "./locales";

/**
 * BCP-47 tag used for number and date formatting.
 *
 * The listings themselves always come from German portals, so amounts stay in euros
 * regardless of UI language — only grouping, decimal separator and date order follow
 * the locale.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  de: "de-DE",
};

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

/** Rent as a whole-euro amount, or an em dash when the portal did not publish one. */
export function formatEur(n: number | null | undefined, locale: Locale): string {
  if (n == null) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Straight-line distance in kilometres. Rejects the same impossible values as
 * `lib/geo.ts`: non-positive, and anything past 1000 km, which in practice means a
 * failed geocode rather than a very long commute.
 */
export function formatDistanceKm(meters: number | null | undefined, locale: Locale): string {
  if (meters == null || meters <= 0 || meters > 1_000_000) return "—";
  const km = meters / 1000;
  const digits = km < 10 ? 1 : 0;
  const value = new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(km);
  return `${value} km`;
}

export function formatDate(ms: number | null | undefined, locale: Locale): string {
  if (ms == null) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(new Date(ms));
}

/**
 * Coarse "how long ago" label — minutes, hours, then days.
 *
 * Formatted here rather than in the browser so server and client render the same
 * string: a locale-dependent value computed during hydration would otherwise trip
 * React's mismatch warning on every card.
 */
export function relativeAge(ms: number | null | undefined, t: TFunction): string {
  if (ms == null) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return t("common.time.justNow");
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return t("common.time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.time.hours", { count: hours });
  const days = Math.floor(hours / 24);
  return t.plural("common.time.days", days);
}
