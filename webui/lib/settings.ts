import { appDb } from "./db";
import { SORT_KEYS, SWIPE_DECK_SORTS } from "./types";
import type { Settings } from "./types";

/**
 * Terms that mark a listing as a single room in a shared flat.
 *
 * German, because every supported portal is a German one and this is matched against
 * the listing title, not against the UI language. Editable in Settings → Filters, so
 * a different market only needs a different list, not a code change. Hyphen and space
 * are interchangeable when matching (see `phraseToRegex` in `score.ts`).
 */
const DEFAULT_SINGLE_ROOM_PATTERNS = [
  "wg-zimmer",
  "einzelzimmer",
  "möbliertes zimmer",
  "möblierte zimmer",
  "monteur-zimmer",
  "arbeiter-zimmer",
  "single-room",
  "zimmer in einer wg",
  "zimmer in eine wg",
  "privat-zimmer",
  "gäste-zimmer",
  "gast-zimmer",
].join(", ");

/**
 * Values used until a key is stored in the database.
 *
 * Deliberately neutral: a fresh install should score sensibly for a single person on
 * an unremarkable budget and let the operator narrow things down in Settings, rather
 * than encode one household's search.
 */
export const DEFAULTS: Settings = {
  voterCount: 1,
  scoringMaxBudget: 1200,
  scoringMaxDistanceKm: 30,

  scoreWeightPrice: 40,
  scoreWeightDistance: 35,
  scoreWeightRooms: 15,
  scoreWeightSize: 10,
  scoreBudgetTolerancePct: 25,
  scoreRoomsIdealPct: 100,
  scoreRoomsOkPct: 70,
  scoreRoomsTightPct: 20,
  scoreSqmGoodThreshold: 30,
  scoreSqmOkThreshold: 20,
  scoreSqmGoodPct: 100,
  scoreSqmOkPct: 70,
  scoreSqmTightPct: 30,
  scoreNeutralPct: 50,
  scoreMaxPlausibleRooms: 12,
  scoreSingleRoomFloor: true,
  singleRoomPatterns: DEFAULT_SINGLE_ROOM_PATTERNS,

  filterMinPrice: 0,
  filterMaxPrice: 0,
  filterMinRooms: 0,
  filterMaxRooms: 0,
  filterMinSize: 0,
  filterMaxSize: 0,
  filterMinSqmPerPerson: 0,
  filterMaxAgeDays: 0,
  filterMaxDistanceKm: 0,
  filterProviders: "",
  hideSingleRoom: true,
  hideSingleRoomByTitle: false,
  excludeKeywords: "",
  excludeKeywordsInAddress: false,
  excludeAddressKeywords: "",
  requireKeywords: "",
  excludeUnknownPrice: false,
  excludeUnknownRooms: false,
  excludeUnknownSize: false,
  excludeUnknownDistance: false,

  highlightKeywords: "",

  displayGoodScore: 4,
  displayWeakScore: 2,
  displayDashboardTopN: 6,
  swipeDeckSize: 50,
  swipeDeckSort: "score",
  defaultSort: "score",
  loadLimit: 2000,

  sharedRoomMode: false,
  startAddress: "",
  startLat: 0,
  startLng: 0,
};

/**
 * Numeric fields where 0 is not a meaningful value — an empty or zero entry falls back
 * to the default instead of producing a division by zero in the score.
 */
const NEVER_ZERO: (keyof Settings)[] = ["voterCount", "scoringMaxBudget", "scoringMaxDistanceKm"];

export function getSettings(): Settings {
  const rows = appDb().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const stored: Record<string, string> = {};
  for (const r of rows) stored[r.key] = r.value;

  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const raw = stored[key];
    if (raw == null) continue;
    const def = DEFAULTS[key];
    if (typeof def === "boolean") {
      (out[key] as boolean) = raw === "1";
    } else if (typeof def === "number") {
      const n = Number(raw);
      if (raw !== "" && Number.isFinite(n)) (out[key] as number) = n;
    } else {
      (out[key] as string) = raw;
    }
  }
  for (const key of NEVER_ZERO) {
    if (!out[key]) (out[key] as number) = DEFAULTS[key] as number;
  }
  // Guard the enum fields against invalid values (a hand-edited database, say)
  if (!SORT_KEYS.includes(out.defaultSort)) out.defaultSort = DEFAULTS.defaultSort;
  if (!SWIPE_DECK_SORTS.includes(out.swipeDeckSort)) out.swipeDeckSort = DEFAULTS.swipeDeckSort;
  return out;
}

/** Split a comma/newline-separated keyword string into lowercased, non-empty terms. */
export function parseKeywords(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function setSettings(patch: Partial<Settings>) {
  const stmt = appDb().prepare(
    "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const tx = appDb().transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) stmt.run(k, v);
  });
  const serialize = (v: unknown): string =>
    typeof v === "boolean" ? (v ? "1" : "0") : String(v ?? "");
  tx(Object.entries(patch).map(([k, v]) => [k, serialize(v)]));
}
