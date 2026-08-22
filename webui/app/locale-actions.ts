"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/i18n";

/**
 * Persist the visitor's language choice.
 *
 * Unlike every other server action this one does not require a session: the language
 * switcher is also on the login page, and the cookie grants nothing. An unknown value
 * is ignored rather than stored, so a hand-crafted request cannot poison the cookie.
 */
export async function setLocaleAction(locale: Locale) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}
