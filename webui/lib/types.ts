export type ListingStatus = "unseen" | "shortlist" | "discarded" | "maybe";

export type RawListing = {
  id: string;
  created_at: number;
  hash: string;
  provider: string;
  job_id: string;
  price: number | null;
  size: number | null;
  rooms: number | null;
  title: string | null;
  image_url: string | null;
  description: string | null;
  address: string | null;
  link: string;
  is_active: number;
  latitude: number | null;
  longitude: number | null;
  /**
   * Fredy < v24: precomputed straight-line distance to the destination in metres.
   * Replaced by `distances` from v24 on (the column was dropped by migration 22);
   * stays optional here so that older instances keep working.
   */
  distance_to_destination?: number | null;
  /**
   * Fredy >= v24: JSON array of the distances to all configured addresses,
   * e.g. `[{"label":"Home","meters":30398.6}]`.
   */
  distances?: string | null;
  manually_deleted: number;
};

export type AvailabilityStatus = "available" | "gone" | "error";

export type Availability = {
  status: AvailabilityStatus;
  httpCode: number | null;
  detail: string | null;
  checkedAt: number;
};

/**
 * One line of the score explanation: a translation key plus the numbers to fill in.
 * `lib/score.ts` never builds finished sentences, so the same result renders in
 * whichever language the viewer picked.
 */
export type ScoreReason = {
  key: string;
  vars?: Record<string, string | number>;
};

export type EnrichedListing = RawListing & {
  score: number;
  scoreReasons: ScoreReason[];
  pricePerPerson: number | null;
  distanceKm: number | null;
  status: ListingStatus;
  decidedAt: number | null;
  /** When the advertiser was contacted — null means not yet. */
  contactedAt: number | null;
  deleted: boolean;
  highlight: boolean;
  availability: Availability | null;
};

export type SortKey = "score" | "newest" | "price_asc" | "price_desc" | "distance";
export const SORT_KEYS: SortKey[] = ["score", "newest", "price_asc", "price_desc", "distance"];

export type SwipeDeckSort = "score" | "newest";
export const SWIPE_DECK_SORTS: SwipeDeckSort[] = ["score", "newest"];

export type Settings = {
  // People moving in together. The field is still called voterCount because that is
  // the key already stored in existing databases.
  voterCount: number;

  // What the score aims at
  scoringMaxBudget: number;
  scoringMaxDistanceKm: number;

  // Component weights. Relative, and re-normalised across whichever components have
  // data — they need not add up to 100. A weight of 0 switches a component off.
  scoreWeightPrice: number;
  scoreWeightDistance: number;
  scoreWeightRooms: number;
  scoreWeightSize: number;

  // Price curve: how many percent over the budget target still scores anything
  scoreBudgetTolerancePct: number;

  // Room tiers, in percent of the full component score:
  // ≥ people + 1 / exactly people / fewer
  scoreRoomsIdealPct: number;
  scoreRoomsOkPct: number;
  scoreRoomsTightPct: number;

  // m² per person: the two thresholds, and the tier scores in percent
  scoreSqmGoodThreshold: number;
  scoreSqmOkThreshold: number;
  scoreSqmGoodPct: number;
  scoreSqmOkPct: number;
  scoreSqmTightPct: number;

  // Composite score in percent when a listing has no usable data at all
  scoreNeutralPct: number;

  // Parser-glitch guard: a room count above this is treated as unknown
  scoreMaxPlausibleRooms: number;

  // Force titles recognised as a single room down to one star (not in shared-room mode)
  scoreSingleRoomFloor: boolean;

  // Terms that identify a single room, comma- or newline-separated. When matching,
  // hyphen and space between the parts are interchangeable.
  singleRoomPatterns: string;

  // Hard filters. 0 or "" means no limit.
  filterMinPrice: number;
  filterMaxPrice: number;
  filterMinRooms: number;
  filterMaxRooms: number;
  filterMinSize: number; // m²
  filterMaxSize: number; // m²
  filterMinSqmPerPerson: number; // m² per person (size / voterCount)
  filterMaxAgeDays: number; // hide listings older than N days
  filterMaxDistanceKm: number;
  filterProviders: string; // comma-separated allowed providers, empty = all
  hideSingleRoom: boolean; // hide listings with exactly one room
  hideSingleRoomByTitle: boolean; // hide titles matched by singleRoomPatterns
  excludeKeywords: string;
  excludeKeywordsInAddress: boolean; // also match the exclude terms against the address
  excludeAddressKeywords: string; // separate exclude terms, address only
  requireKeywords: string; // keep only listings matching at least one (title/description)

  // Unknown values are kept by default — these toggles drop them instead
  excludeUnknownPrice: boolean;
  excludeUnknownRooms: boolean;
  excludeUnknownSize: boolean;
  excludeUnknownDistance: boolean;

  // Highlights
  highlightKeywords: string;

  // Presentation and limits
  displayGoodScore: number; // "good" threshold (score ≥ N)
  displayWeakScore: number; // "weak" threshold (score ≤ N)
  displayDashboardTopN: number; // how many top picks the dashboard shows
  swipeDeckSize: number;
  swipeDeckSort: SwipeDeckSort;
  defaultSort: SortKey; // default order in the lists and on the search page
  loadLimit: number; // how many active listings to read from Fredy's database at once

  // Shared-room mode: look for a single room instead of a whole flat. Disables the
  // single-room score floor and the room-count component, and stops single rooms from
  // being hidden (overrides hideSingleRoom).
  sharedRoomMode: boolean;

  // Origin for distance and score. startLat/startLng = 0 ⇒ fall back to the distance
  // Fredy precomputed against its own destination.
  startAddress: string;
  startLat: number;
  startLng: number;
};
