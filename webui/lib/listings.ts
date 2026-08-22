import { appDb, fredyDb } from "./db";
import { computeScore, looksLikeSingleRoom } from "./score";
import { resolveDistanceKm } from "./geo";
import { lookupCachedCoords, normalizeAddressKey } from "./geocode-listings";
import { hasRealCoords } from "./maps";
import { getSettings, parseKeywords } from "./settings";
import { SORT_KEYS } from "./types";
import type {
  Availability,
  AvailabilityStatus,
  EnrichedListing,
  ListingStatus,
  RawListing,
  Settings,
  SortKey,
} from "./types";

export type { SortKey };

/**
 * Fills in the coordinates of listings that Fredy delivered without (usable) geo data:
 * for those we fall back on our own geocode cache (`lib/geocode-listings.ts`).
 * Everything downstream — distance, distance filter, sorting, Google Maps link — then
 * carries on as normal, without `lib/geo.ts` or `lib/maps.ts` (client bundle) having to
 * know about the database.
 */
function withGeocodedCoords(rows: RawListing[]): RawListing[] {
  const missing = rows.filter(
    (r) => !hasRealCoords(r.latitude, r.longitude) && (r.address ?? "").trim().length > 0,
  );
  if (missing.length === 0) return rows;
  const cached = lookupCachedCoords(missing.map((r) => r.address as string));
  if (cached.size === 0) return rows;
  return rows.map((r) => {
    if (hasRealCoords(r.latitude, r.longitude)) return r;
    const address = (r.address ?? "").trim();
    if (!address) return r;
    const coords = cached.get(normalizeAddressKey(address));
    return coords ? { ...r, latitude: coords.lat, longitude: coords.lng } : r;
  });
}

/** True if any keyword appears in the listing's title or description (case-insensitive). */
function matchesKeywords(listing: RawListing, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const haystack = `${listing.title ?? ""}\n${listing.description ?? ""}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

/** Hard-filter rule: removes listings everywhere (browse tabs, swipe deck, dashboard
 *  counters) based on the global Settings-criteria. Listings with *unknown* values
 *  (price/rooms/size/distance null) are kept by default — missing data is neutral —
 *  unless the corresponding excludeUnknown* toggle is on. */
export function isHardFiltered(listing: RawListing, settings: Settings): boolean {
  // In shared-room mode single rooms are NOT hidden — they are what is being looked for.
  if (!settings.sharedRoomMode) {
    if (settings.hideSingleRoom && listing.rooms === 1) return true;
    if (settings.hideSingleRoomByTitle && looksLikeSingleRoom(listing.title, settings)) return true;
  }

  // Exclusion keywords: title + description, optionally the address as well
  const exclude = parseKeywords(settings.excludeKeywords);
  if (exclude.length > 0) {
    const haystack = (
      `${listing.title ?? ""}\n${listing.description ?? ""}` +
      (settings.excludeKeywordsInAddress ? `\n${listing.address ?? ""}` : "")
    ).toLowerCase();
    if (exclude.some((k) => haystack.includes(k))) return true;
  }

  // Separate exclusion terms that apply to the address only (e.g. unwanted places)
  const excludeAddress = parseKeywords(settings.excludeAddressKeywords);
  if (excludeAddress.length > 0) {
    const address = (listing.address ?? "").toLowerCase();
    if (excludeAddress.some((k) => address.includes(k))) return true;
  }

  // Required keywords: at least one term must appear in the title or description
  const required = parseKeywords(settings.requireKeywords);
  if (required.length > 0 && !matchesKeywords(listing, required)) return true;

  // Range checks treat null as unknown (as they always have); the excludeUnknown*
  // toggles additionally count 0/negative as unknown (the same way the scoring does).
  const price = listing.price;
  if (settings.excludeUnknownPrice && (price == null || price <= 0)) return true;
  if (settings.filterMinPrice > 0 && price != null && price < settings.filterMinPrice) return true;
  if (settings.filterMaxPrice > 0 && price != null && price > settings.filterMaxPrice) return true;

  const rooms = listing.rooms;
  if (settings.excludeUnknownRooms && (rooms == null || rooms <= 0)) return true;
  if (settings.filterMinRooms > 0 && rooms != null && rooms < settings.filterMinRooms) return true;
  if (settings.filterMaxRooms > 0 && rooms != null && rooms > settings.filterMaxRooms) return true;

  const size = listing.size;
  if (settings.excludeUnknownSize && (size == null || size <= 0)) return true;
  if (settings.filterMinSize > 0 && size != null && size < settings.filterMinSize) return true;
  if (settings.filterMaxSize > 0 && size != null && size > settings.filterMaxSize) return true;
  if (settings.filterMinSqmPerPerson > 0 && size != null && size > 0) {
    const sqmPerPerson = size / Math.max(1, settings.voterCount);
    if (sqmPerPerson < settings.filterMinSqmPerPerson) return true;
  }

  if (settings.filterMaxAgeDays > 0 && listing.created_at) {
    const ageDays = (Date.now() - listing.created_at) / 86_400_000;
    if (ageDays > settings.filterMaxAgeDays) return true;
  }

  if (settings.filterMaxDistanceKm > 0 || settings.excludeUnknownDistance) {
    const d = resolveDistanceKm(listing, settings);
    if (settings.excludeUnknownDistance && d == null) return true;
    if (settings.filterMaxDistanceKm > 0 && d != null && d > settings.filterMaxDistanceKm)
      return true;
  }

  const providers = parseKeywords(settings.filterProviders);
  if (providers.length > 0 && !providers.includes((listing.provider ?? "").toLowerCase()))
    return true;

  return false;
}

type StatusRow = { listing_id: string; status: ListingStatus; decided_at: number };

function fetchStatuses(ids: string[]): Map<string, StatusRow> {
  const out = new Map<string, StatusRow>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => "?").join(",");
  const rows = appDb()
    .prepare(
      `SELECT listing_id, status, decided_at
       FROM listing_status WHERE listing_id IN (${placeholders})`,
    )
    .all(...ids) as StatusRow[];
  for (const r of rows) out.set(r.listing_id, r);
  return out;
}

function fetchDeleted(ids: string[]): Set<string> {
  const out = new Set<string>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => "?").join(",");
  const rows = appDb()
    .prepare(`SELECT listing_id FROM listing_deleted WHERE listing_id IN (${placeholders})`)
    .all(...ids) as { listing_id: string }[];
  for (const r of rows) out.add(r.listing_id);
  return out;
}

/** listing_id → time of first contact (only for listings that were contacted). */
function fetchContacted(ids: string[]): Map<string, number> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => "?").join(",");
  const rows = appDb()
    .prepare(
      `SELECT listing_id, contacted_at FROM listing_contacted WHERE listing_id IN (${placeholders})`,
    )
    .all(...ids) as { listing_id: string; contacted_at: number }[];
  for (const r of rows) out.set(r.listing_id, r.contacted_at);
  return out;
}

type AvailabilityRow = {
  listing_id: string;
  status: AvailabilityStatus;
  http_code: number | null;
  detail: string | null;
  checked_at: number;
};

function fetchAvailability(ids: string[]): Map<string, Availability> {
  const out = new Map<string, Availability>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => "?").join(",");
  const rows = appDb()
    .prepare(
      `SELECT listing_id, status, http_code, detail, checked_at
       FROM listing_availability WHERE listing_id IN (${placeholders})`,
    )
    .all(...ids) as AvailabilityRow[];
  for (const r of rows)
    out.set(r.listing_id, {
      status: r.status,
      httpCode: r.http_code,
      detail: r.detail,
      checkedAt: r.checked_at,
    });
  return out;
}

function enrich(raws: RawListing[]): EnrichedListing[] {
  const settings = getSettings();
  const highlightKeywords = parseKeywords(settings.highlightKeywords);
  const ids = raws.map((r) => r.id);
  const statuses = fetchStatuses(ids);
  const deleted = fetchDeleted(ids);
  const contacted = fetchContacted(ids);
  const availability = fetchAvailability(ids);
  return raws.map((r) => {
    const { score, reasons, pricePerPerson, distanceKm } = computeScore(
      r,
      settings,
      resolveDistanceKm(r, settings),
    );
    const st = statuses.get(r.id);
    return {
      ...r,
      score,
      scoreReasons: reasons,
      pricePerPerson,
      distanceKm,
      status: (st?.status ?? "unseen") as ListingStatus,
      decidedAt: st?.decided_at ?? null,
      contactedAt: contacted.get(r.id) ?? null,
      deleted: deleted.has(r.id),
      highlight: matchesKeywords(r, highlightKeywords),
      availability: availability.get(r.id) ?? null,
    };
  });
}

export type ListingsFilter =
  | "good"
  | "weak"
  | "all"
  | "shortlist"
  | "discarded"
  | "maybe"
  | "deleted";

/** Raw rows from Fredy that survive the hard filter (swap offers / single rooms).
 *  Used by every browse view, the swipe deck and the dashboard counters. */
function loadAllActive(): RawListing[] {
  const settings = getSettings();
  const rows = fredyDb()
    .prepare(
      `SELECT * FROM listings
       WHERE is_active = 1 AND manually_deleted = 0
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(settings.loadLimit) as RawListing[];
  // Insert looked-up coordinates BEFORE the hard filter, so the distance filter sees
  // the same distance the UI displays.
  return withGeocodedCoords(rows).filter((r) => !isHardFiltered(r, settings));
}

export function getListings(filter: ListingsFilter = "all"): EnrichedListing[] {
  const settings = getSettings();
  const all = enrich(loadAllActive());
  // Deleted listings are hidden from every view except the dedicated "deleted" tab.
  const live = all.filter((l) => !l.deleted);

  switch (filter) {
    case "good":
      return live.filter((l) => l.status !== "discarded" && l.score >= settings.displayGoodScore);
    case "weak":
      return live.filter((l) => l.status !== "discarded" && l.score <= settings.displayWeakScore);
    case "shortlist":
      return live
        .filter((l) => l.status === "shortlist")
        .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0));
    case "maybe":
      return live
        .filter((l) => l.status === "maybe")
        .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0));
    case "discarded":
      return live
        .filter((l) => l.status === "discarded")
        .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0));
    case "deleted":
      return all
        .filter((l) => l.deleted)
        .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    default:
      return live.filter((l) => l.status !== "discarded");
  }
}

/** Listings that haven't been decided on yet — deck size and order are configurable. */
export function getSwipeDeck(): EnrichedListing[] {
  const settings = getSettings();
  const byScore = (a: EnrichedListing, b: EnrichedListing) =>
    b.score - a.score || (b.created_at ?? 0) - (a.created_at ?? 0);
  const byNewest = (a: EnrichedListing, b: EnrichedListing) =>
    (b.created_at ?? 0) - (a.created_at ?? 0);
  return enrich(loadAllActive())
    .filter((l) => !l.deleted && l.status === "unseen")
    .sort(settings.swipeDeckSort === "newest" ? byNewest : byScore)
    .slice(0, settings.swipeDeckSize);
}

export function getListing(id: string): EnrichedListing | null {
  const row = fredyDb().prepare(`SELECT * FROM listings WHERE id = ?`).get(id) as
    | RawListing
    | undefined;
  if (!row) return null;
  return enrich(withGeocodedCoords([row]))[0];
}

export type DashboardStats = ReturnType<typeof getDashboardStats>;

/** Only the numbers the dashboard actually shows: four key figures plus the
 *  provider mix. Everything else was dropped with the dashboard rebuild. */
export function getDashboardStats(precomputed?: EnrichedListing[]) {
  const settings = getSettings();
  const all = precomputed ?? enrich(loadAllActive());
  const perProvider = fredyDb()
    .prepare(
      `SELECT provider, COUNT(*) as n FROM listings
       WHERE is_active = 1 AND manually_deleted = 0 GROUP BY provider`,
    )
    .all() as { provider: string; n: number }[];
  const newestMs = (
    fredyDb()
      .prepare(`SELECT MAX(created_at) as last FROM listings WHERE is_active = 1`)
      .get() as { last: number | null }
  ).last;

  const live = all.filter((l) => !l.deleted);
  const visible = live.filter((l) => l.status !== "discarded");

  return {
    unseen: live.filter((l) => l.status === "unseen").length,
    shortlist: live.filter((l) => l.status === "shortlist").length,
    good: visible.filter((l) => l.score >= settings.displayGoodScore).length,
    newestMs,
    perProvider,
  };
}

/** Sets/clears the "contacted" marker. An already recorded timestamp is kept — the
 *  first contact is the interesting one. */
export function setContacted(listingId: string, contacted: boolean): void {
  const db = appDb();
  if (!contacted) {
    db.prepare(`DELETE FROM listing_contacted WHERE listing_id = ?`).run(listingId);
    return;
  }
  db.prepare(
    `INSERT INTO listing_contacted(listing_id, contacted_at) VALUES (?, ?)
     ON CONFLICT(listing_id) DO NOTHING`,
  ).run(listingId, Date.now());
}

export function setListingStatus(listingId: string, status: ListingStatus) {
  const db = appDb();
  if (status === "unseen") {
    db.prepare(`DELETE FROM listing_status WHERE listing_id = ?`).run(listingId);
    return;
  }
  db.prepare(
    `INSERT INTO listing_status(listing_id, status, decided_at)
     VALUES (?, ?, ?)
     ON CONFLICT(listing_id) DO UPDATE SET status = excluded.status, decided_at = excluded.decided_at`,
  ).run(listingId, status, Date.now());
}

/** Soft-delete one or more listings. Their listing_status is left intact, so a
 *  restore brings them back to whatever state (shortlist/maybe/…) they were in. */
export function deleteListings(listingIds: string[]) {
  if (listingIds.length === 0) return;
  const db = appDb();
  const stmt = db.prepare(
    `INSERT INTO listing_deleted(listing_id, deleted_at) VALUES (?, ?)
     ON CONFLICT(listing_id) DO NOTHING`,
  );
  const now = Date.now();
  db.transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id, now);
  })(listingIds);
}

export function restoreDeleted(listingIds: string[]) {
  if (listingIds.length === 0) return;
  const db = appDb();
  const stmt = db.prepare(`DELETE FROM listing_deleted WHERE listing_id = ?`);
  db.transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id);
  })(listingIds);
}

/** Full-text-ish search across the ENTIRE Fredy DB — deliberately ignores the
 *  hard-filter and soft-deletes so it can act as an escape hatch. Status / deleted
 *  flags come through via enrich() so the UI can badge them. */
export function searchAllListings(query: string, limit = 200): EnrichedListing[] {
  const q = query.trim();
  if (q.length === 0) return [];
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  const rows = fredyDb()
    .prepare(
      `SELECT * FROM listings
       WHERE is_active = 1 AND manually_deleted = 0
         AND (title LIKE ? ESCAPE '\\'
              OR description LIKE ? ESCAPE '\\'
              OR address LIKE ? ESCAPE '\\')
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(like, like, like, limit) as RawListing[];
  return enrich(withGeocodedCoords(rows)).sort((a, b) => b.score - a.score || (b.created_at ?? 0) - (a.created_at ?? 0));
}

/** Ad-hoc filters from the filter bar. All fields optional; empty/0 values mean "don't
 *  care". They apply on top of — or instead of — the hard settings filters. */
export type ListingQuery = {
  text?: string;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  maxDistanceKm?: number;
  providers?: string[];
  highlightsOnly?: boolean;
  minScore?: number;
  status?: ListingStatus | "any";
  includeDeleted?: boolean;
  includeDiscarded?: boolean; // show discarded (swiped-down) listings
  includeHardFiltered?: boolean; // search escape hatch: show filtered-out listings too
  sort?: SortKey;
  limit?: number;
};

function sortComparator(sort: SortKey): (a: EnrichedListing, b: EnrichedListing) => number {
  switch (sort) {
    case "newest":
      return (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0);
    case "price_asc":
      return (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity);
    case "price_desc":
      return (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity);
    case "distance":
      return (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    case "score":
    default:
      return (a, b) => b.score - a.score || (b.created_at ?? 0) - (a.created_at ?? 0);
  }
}

/** The single filter/search core behind both the listings and the search view. Loads
 *  active rows, (optionally) applies the hard settings filters, enriches them, then runs
 *  the ad-hoc query + sort. */
export function queryListings(q: ListingQuery = {}): EnrichedListing[] {
  const settings = getSettings();
  const rows = fredyDb()
    .prepare(
      `SELECT * FROM listings
       WHERE is_active = 1 AND manually_deleted = 0
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(settings.loadLimit) as RawListing[];

  const geo = withGeocodedCoords(rows);
  const base = q.includeHardFiltered ? geo : geo.filter((r) => !isHardFiltered(r, settings));
  let list = enrich(base);

  if (!q.includeDeleted) list = list.filter((l) => !l.deleted);
  if (q.status && q.status !== "any") {
    list = list.filter((l) => l.status === q.status);
  } else if (!q.includeDiscarded) {
    // Hide discarded (swiped-down) listings — as everywhere else, unless the toggle is
    // on or the caller explicitly filters for status="discarded".
    list = list.filter((l) => l.status !== "discarded");
  }

  const text = q.text?.trim().toLowerCase();
  if (text) {
    list = list.filter((l) =>
      `${l.title ?? ""}\n${l.description ?? ""}\n${l.address ?? ""}`.toLowerCase().includes(text),
    );
  }

  if (q.minPrice) list = list.filter((l) => l.price == null || l.price >= q.minPrice!);
  if (q.maxPrice) list = list.filter((l) => l.price == null || l.price <= q.maxPrice!);
  if (q.minRooms) list = list.filter((l) => l.rooms == null || l.rooms >= q.minRooms!);
  if (q.maxRooms) list = list.filter((l) => l.rooms == null || l.rooms <= q.maxRooms!);
  if (q.maxDistanceKm)
    list = list.filter((l) => l.distanceKm == null || l.distanceKm <= q.maxDistanceKm!);
  if (q.providers && q.providers.length > 0) {
    const set = new Set(q.providers.map((p) => p.toLowerCase()));
    list = list.filter((l) => set.has((l.provider ?? "").toLowerCase()));
  }
  if (q.highlightsOnly) list = list.filter((l) => l.highlight);
  if (q.minScore) list = list.filter((l) => l.score >= q.minScore!);

  list.sort(sortComparator(q.sort ?? settings.defaultSort));
  return q.limit ? list.slice(0, q.limit) : list;
}

/** Builds a ListingQuery from raw URL search params (for /search and /listings). */
export function parseListingQuery(sp: Record<string, string | string[] | undefined>): ListingQuery {
  const str = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const posNum = (v: string | string[] | undefined): number | undefined => {
    const n = Number(str(v));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const providers = (str(sp.providers) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sortRaw = str(sp.sort) as SortKey | undefined;
  const all = str(sp.all) === "1";

  return {
    // `sort` stays undefined when the URL carries nothing (valid) — queryListings then
    // falls back to settings.defaultSort.
    text: str(sp.q)?.trim() || undefined,
    minPrice: posNum(sp.minPrice),
    maxPrice: posNum(sp.maxPrice),
    minRooms: posNum(sp.minRooms),
    maxRooms: posNum(sp.maxRooms),
    maxDistanceKm: posNum(sp.maxDist),
    minScore: posNum(sp.minScore),
    providers: providers.length > 0 ? providers : undefined,
    highlightsOnly: str(sp.hi) === "1" || undefined,
    includeHardFiltered: all || undefined,
    includeDeleted: all || undefined,
    includeDiscarded: all || undefined,
    sort: sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : undefined,
  };
}

/** Distinct provider keys present in the active Fredy DB (for the filter UI). */
export function getAvailableProviders(): string[] {
  const rows = fredyDb()
    .prepare(`SELECT DISTINCT provider FROM listings WHERE is_active = 1 AND provider IS NOT NULL`)
    .all() as { provider: string }[];
  return rows.map((r) => r.provider).filter(Boolean).sort();
}

/** Raw active listings for the availability checker — bypasses the hard filter so a
 *  swap offer the user shortlisted before turning the filter on is still checked. */
export function loadCheckableListings(): RawListing[] {
  return fredyDb()
    .prepare(
      `SELECT * FROM listings WHERE is_active = 1 AND manually_deleted = 0 LIMIT ?`,
    )
    .all(getSettings().loadLimit) as RawListing[];
}

export function saveAvailabilityResults(
  results: { listingId: string; status: AvailabilityStatus; httpCode: number | null; detail: string | null }[],
) {
  if (results.length === 0) return;
  const db = appDb();
  const stmt = db.prepare(
    `INSERT INTO listing_availability(listing_id, status, http_code, detail, checked_at)
     VALUES (@listing_id, @status, @http_code, @detail, @checked_at)
     ON CONFLICT(listing_id) DO UPDATE SET
       status = excluded.status, http_code = excluded.http_code,
       detail = excluded.detail, checked_at = excluded.checked_at`,
  );
  const now = Date.now();
  db.transaction((rows: typeof results) => {
    for (const r of rows)
      stmt.run({
        listing_id: r.listingId,
        status: r.status,
        http_code: r.httpCode,
        detail: r.detail,
        checked_at: now,
      });
  })(results);
}
