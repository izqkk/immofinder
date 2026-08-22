import { de } from "./de";
import { en } from "./en";
import type { Locale } from "../locales";

/**
 * The shape every locale must satisfy. English is the reference: adding a key there
 * makes the German dictionary fail to type-check until it is translated too, which is
 * the only reliable way to keep the two in step.
 */
export type Dictionary = typeof en;

export const dictionaries: Record<Locale, Dictionary> = { en, de };
