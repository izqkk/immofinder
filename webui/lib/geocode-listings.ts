// Back-fills coordinates for listing addresses. Fredy delivers roughly one in six
// listings without usable coordinates (SQL NULL, or its -1/-1 sentinel), and without
// them there is no distance to show. We resolve the address ourselves via Nominatim
// and store the result in *our* database — Fredy's is opened read-only.
//
// Nominatim etiquette is mandatory: at most one request per second, a meaningful
// User-Agent, and a hard stop on 429/5xx rather than hammering a free service.

import { appDb, fredyDb } from "./db";
import { GEOCODER_USER_AGENT } from "./geocoder-agent";
import { hasRealCoords } from "./maps";

export type Coords = { lat: number; lng: number };

export type GeocodeRunSummary = { resolved: number; missed: number };

/** An address that produced no hit is retried only after this long. */
export const MISS_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum gap between two Nominatim requests (at most 1 req/s). */
const REQUEST_INTERVAL_MS = 1100;

const USER_AGENT = GEOCODER_USER_AGENT;

/** Stay comfortably below SQLite's bound-parameter limit. */
const SQL_CHUNK = 400;

/** Normalised form of the address — this is the cache key. */
export function normalizeAddressKey(address: string): string {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type CacheRow = { address_key: string; lat: number | null; lng: number | null; miss: number; resolved_at: number };

/**
 * Cached coordinates for several addresses — the key of the map is the
 * *normalised* address key. Misses (no hit) do not show up.
 */
export function lookupCachedCoords(addresses: string[]): Map<string, Coords> {
  const out = new Map<string, Coords>();
  const keys = [...new Set(addresses.map((a) => normalizeAddressKey(a ?? "")).filter(Boolean))];
  if (keys.length === 0) return out;
  const db = appDb();
  for (const part of chunk(keys, SQL_CHUNK)) {
    const placeholders = part.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT address_key, lat, lng, miss, resolved_at FROM geocode_cache
         WHERE miss = 0 AND lat IS NOT NULL AND lng IS NOT NULL
           AND address_key IN (${placeholders})`,
      )
      .all(...part) as CacheRow[];
    for (const r of rows) out.set(r.address_key, { lat: r.lat!, lng: r.lng! });
  }
  return out;
}

/** Writes a hit into the cache (overwriting an earlier miss). */
export function storeCoords(addressKey: string, coords: Coords): void {
  appDb()
    .prepare(
      `INSERT INTO geocode_cache(address_key, lat, lng, resolved_at, miss)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(address_key) DO UPDATE SET
         lat = excluded.lat, lng = excluded.lng,
         resolved_at = excluded.resolved_at, miss = 0`,
    )
    .run(addressKey, coords.lat, coords.lng, Date.now());
}

/** Records that Nominatim found nothing for this address. */
export function storeMiss(addressKey: string): void {
  appDb()
    .prepare(
      `INSERT INTO geocode_cache(address_key, lat, lng, resolved_at, miss)
       VALUES (?, NULL, NULL, ?, 1)
       ON CONFLICT(address_key) DO UPDATE SET
         lat = NULL, lng = NULL, resolved_at = excluded.resolved_at, miss = 1`,
    )
    .run(addressKey, Date.now());
}

type CandidateRow = {
  id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Active, not manually deleted listings without usable Fredy coordinates, whose address
 * is not in the cache yet (or only as a stale miss). Exactly one entry per address —
 * we ask once per address, not once per listing.
 */
export function listingsNeedingGeocode(limit: number): { id: string; address: string }[] {
  if (limit <= 0) return [];
  const rows = fredyDb()
    .prepare(
      `SELECT id, address, latitude, longitude FROM listings
       WHERE is_active = 1 AND manually_deleted = 0
         AND address IS NOT NULL AND TRIM(address) <> ''
       ORDER BY created_at DESC`,
    )
    .all() as CandidateRow[];

  // De-duplicate by address key; only listings without usable coordinates of their own.
  const byKey = new Map<string, { id: string; address: string }>();
  for (const r of rows) {
    if (hasRealCoords(r.latitude, r.longitude)) continue;
    const address = (r.address ?? "").trim();
    const key = normalizeAddressKey(address);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, { id: r.id, address });
  }
  if (byKey.size === 0) return [];

  // Soft-deleted listings are of no interest — unless another, not deleted address
  // shares the same key (then it stays in).
  const deleted = new Set<string>();
  const ids = [...byKey.values()].map((v) => v.id);
  const app = appDb();
  for (const part of chunk(ids, SQL_CHUNK)) {
    const placeholders = part.map(() => "?").join(",");
    const del = app
      .prepare(`SELECT listing_id FROM listing_deleted WHERE listing_id IN (${placeholders})`)
      .all(...part) as { listing_id: string }[];
    for (const d of del) deleted.add(d.listing_id);
  }

  const keys = [...byKey.keys()];
  const cached = new Map<string, { miss: number; resolved_at: number }>();
  for (const part of chunk(keys, SQL_CHUNK)) {
    const placeholders = part.map(() => "?").join(",");
    const hits = app
      .prepare(
        `SELECT address_key, miss, resolved_at FROM geocode_cache
         WHERE address_key IN (${placeholders})`,
      )
      .all(...part) as CacheRow[];
    for (const h of hits) cached.set(h.address_key, { miss: h.miss, resolved_at: h.resolved_at });
  }

  const now = Date.now();
  const out: { id: string; address: string }[] = [];
  for (const [key, entry] of byKey) {
    if (deleted.has(entry.id)) continue;
    const c = cached.get(key);
    if (c) {
      if (c.miss !== 1) continue; // a hit is already on record
      if (now - c.resolved_at < MISS_RETRY_MS) continue; // fresh miss → do not ask again
    }
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
}

/** Number of open addresses (capped), to decide whether to start a run at all. */
export function countPendingGeocode(limit = 200): number {
  return listingsNeedingGeocode(limit).length;
}

function withCountry(address: string): string {
  return /deutschland|germany/i.test(address) ? address : `${address}, Deutschland`;
}

type LookupOutcome =
  | { kind: "hit"; coords: Coords }
  | { kind: "miss" }
  /** 429/5xx or a network error ⇒ end the run instead of asking on. */
  | { kind: "stop"; reason: string };

async function lookupOnce(address: string): Promise<LookupOutcome> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=` +
    encodeURIComponent(withCountry(address));
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "de" },
      cache: "no-store",
    });
  } catch (e) {
    return { kind: "stop", reason: e instanceof Error ? e.message : "fetch failed" };
  }
  if (res.status === 429 || res.status >= 500) {
    return { kind: "stop", reason: `HTTP ${res.status}` };
  }
  if (!res.ok) return { kind: "miss" };

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { kind: "miss" };
  }
  if (!Array.isArray(data) || data.length === 0) return { kind: "miss" };
  const first = data[0] as { lat?: string; lon?: string };
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!hasRealCoords(lat, lng)) return { kind: "miss" };
  return { kind: "hit", coords: { lat, lng } };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves up to `limit` open addresses and writes both hits and misses into the
 * cache. At least one second passes between two requests (Nominatim etiquette),
 * and the requests deliberately run one after another.
 */
export async function geocodeMissing(
  limit: number,
  onProgress?: (done: number, total: number) => void,
): Promise<GeocodeRunSummary> {
  const pending = listingsNeedingGeocode(limit);
  onProgress?.(0, pending.length);
  let resolved = 0;
  let missed = 0;

  for (let i = 0; i < pending.length; i++) {
    if (i > 0) await delay(REQUEST_INTERVAL_MS);
    const { address } = pending[i];
    const key = normalizeAddressKey(address);
    const outcome = await lookupOnce(address);
    if (outcome.kind === "stop") break;
    if (outcome.kind === "hit") {
      storeCoords(key, outcome.coords);
      resolved++;
    } else {
      storeMiss(key);
      missed++;
    }
    onProgress?.(i + 1, pending.length);
  }

  return { resolved, missed };
}
