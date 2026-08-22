import { parseKeywords } from "./settings";
import type { RawListing, ScoreReason, Settings } from "./types";

export type ScoreResult = {
  score: number;
  reasons: ScoreReason[];
  pricePerPerson: number | null;
  distanceKm: number | null;
};

const VALID_DISTANCE_MAX_M = 1_000_000;

export function distanceKmFromMeters(m: number | null | undefined): number | null {
  if (m == null || m <= 0 || m > VALID_DISTANCE_MAX_M) return null;
  return m / 1000;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Score is computed from up to 4 components. Each component is either
 * a value in [0,1] with a base weight, or skipped (weight 0) when the
 * underlying data is missing — so missing data does not penalise a listing,
 * the remaining components are re-normalised to fill the full weight.
 */
type Component = { weight: number; value: number; reason: ScoreReason };

/**
 * A phrase like "shared room" → /\bshared[\s-]?room\b/i: word boundaries, with hyphen
 * and space interchangeable between the parts. Phrases are regex-escaped, so a user
 * cannot smuggle a pattern of their own into the matcher.
 */
function phraseToRegex(phrase: string): RegExp | null {
  const tokens = phrase
    .split(/[\s-]+/)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return new RegExp(`\\b${tokens.join("[\\s-]?")}\\b`, "i");
}

// Cache the compiled list per pattern string: settings change rarely, but
// looksLikeSingleRoom runs once per listing.
let cachedPatternsRaw: string | null = null;
let cachedRegexes: RegExp[] = [];

function singleRoomRegexes(patternsRaw: string): RegExp[] {
  if (patternsRaw !== cachedPatternsRaw) {
    cachedRegexes = parseKeywords(patternsRaw)
      .map(phraseToRegex)
      .filter((r): r is RegExp => r != null);
    cachedPatternsRaw = patternsRaw;
  }
  return cachedRegexes;
}

/**
 * True when the title looks like a single room in a shared flat (configurable term
 * list). Used by the score floor and, optionally, by the hard filter.
 */
export function looksLikeSingleRoom(title: string | null | undefined, settings: Settings): boolean {
  if (!title) return false;
  return singleRoomRegexes(settings.singleRoomPatterns).some((p) => p.test(title));
}

export function computeScore(
  listing: RawListing,
  settings: Settings,
  distanceKm: number | null,
): ScoreResult {
  const voters = Math.max(1, settings.voterCount);
  const sharedRoomMode = settings.sharedRoomMode;
  const ppp = listing.price && listing.price > 0 ? listing.price / voters : null;

  // Hard floor: a single room can never serve a multi-person move. In shared-room
  // mode that room is exactly the goal, so the floor does not apply.
  if (
    !sharedRoomMode &&
    settings.scoreSingleRoomFloor &&
    looksLikeSingleRoom(listing.title, settings)
  ) {
    return {
      score: 1,
      reasons: [{ key: "score.reason.singleRoomFloor" }],
      pricePerPerson: ppp,
      distanceKm,
    };
  }

  const components: Component[] = [];

  // A: price-per-person
  if (ppp != null && settings.scoreWeightPrice > 0) {
    const target = settings.scoringMaxBudget / voters;
    const ratio = ppp / target;
    const tolerance = 1 + settings.scoreBudgetTolerancePct / 100;
    const v = clamp(tolerance - ratio, 0, 1);
    const vars = { amount: Math.round(ppp) };
    let key: string;
    if (ppp <= target * 0.75) key = "score.reason.priceCheap";
    else if (ppp <= target) key = "score.reason.priceInBudget";
    else if (ppp <= target * 1.1) key = "score.reason.priceSlightlyOver";
    else key = "score.reason.priceOverBudget";
    components.push({ weight: settings.scoreWeightPrice, value: v, reason: { key, vars } });
  }

  // B: distance — skip if unknown
  if (distanceKm != null && settings.scoreWeightDistance > 0) {
    const v = clamp(1 - distanceKm / Math.max(1, settings.scoringMaxDistanceKm), 0, 1);
    let key: string;
    let km: string;
    if (distanceKm <= 10) {
      key = "score.reason.distanceCentral";
      km = distanceKm.toFixed(1);
    } else if (distanceKm <= 20) {
      key = "score.reason.distanceOuter";
      km = distanceKm.toFixed(1);
    } else if (distanceKm <= 30) {
      key = "score.reason.distanceSurrounding";
      km = distanceKm.toFixed(0);
    } else {
      key = "score.reason.distanceFar";
      km = distanceKm.toFixed(0);
    }
    components.push({ weight: settings.scoreWeightDistance, value: v, reason: { key, vars: { km } } });
  }

  // C: rooms bonus — clamped to a plausible range to absorb parser glitches.
  // Skipped in shared-room mode: with a single room the room count says nothing.
  const rawRooms = listing.rooms ?? 0;
  const rooms = rawRooms > settings.scoreMaxPlausibleRooms ? 0 : rawRooms;
  if (!sharedRoomMode && rooms > 0 && settings.scoreWeightRooms > 0) {
    let v: number;
    let key: string;
    if (rooms >= voters + 1) {
      v = settings.scoreRoomsIdealPct / 100;
      key = "score.reason.roomsIdeal";
    } else if (rooms >= voters) {
      v = settings.scoreRoomsOkPct / 100;
      key = "score.reason.roomsOk";
    } else {
      v = settings.scoreRoomsTightPct / 100;
      key = "score.reason.roomsTight";
    }
    components.push({
      weight: settings.scoreWeightRooms,
      value: v,
      reason: { key, vars: { rooms } },
    });
  }

  // D: sqm-per-person
  const sqmPerPerson = listing.size && listing.size > 0 ? listing.size / voters : null;
  if (sqmPerPerson != null && settings.scoreWeightSize > 0) {
    let v: number;
    let key: string;
    if (sqmPerPerson >= settings.scoreSqmGoodThreshold) {
      v = settings.scoreSqmGoodPct / 100;
      key = "score.reason.sqmGood";
    } else if (sqmPerPerson >= settings.scoreSqmOkThreshold) {
      v = settings.scoreSqmOkPct / 100;
      key = "score.reason.sqmOk";
    } else {
      v = settings.scoreSqmTightPct / 100;
      key = "score.reason.sqmTight";
    }
    components.push({
      weight: settings.scoreWeightSize,
      value: v,
      reason: { key, vars: { sqm: Math.round(sqmPerPerson) } },
    });
  }

  // Re-normalise across present components — missing data is "neutral", not penalising
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const composite =
    totalWeight === 0
      ? clamp(settings.scoreNeutralPct / 100, 0, 1)
      : components.reduce((s, c) => s + (c.value * c.weight) / totalWeight, 0);
  const stars = clamp(Math.round(composite * 5), 1, 5);
  const reasons = components.map((c) => c.reason);
  if (ppp == null) reasons.push({ key: "score.reason.priceUnknown" });
  if (distanceKm == null) reasons.push({ key: "score.reason.distanceUnknown" });
  if (!sharedRoomMode && rooms === 0) reasons.push({ key: "score.reason.roomsUnknown" });
  if (sqmPerPerson == null) reasons.push({ key: "score.reason.sizeUnknown" });

  return { score: stars, reasons, pricePerPerson: ppp, distanceKm };
}
