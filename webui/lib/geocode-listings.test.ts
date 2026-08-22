import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Dedicated temporary databases: the app DB holds the geocode cache, the "Fredy" DB
// supplies the candidates. Both are set before lib/db.ts is imported.
const dir = mkdtempSync(join(tmpdir(), "immo-geo-"));
const APP_DB = join(dir, "webui.db");
const FREDY_DB = join(dir, "listings.db");
process.env.WEBUI_DB_PATH = APP_DB;
process.env.FREDY_DB_PATH = FREDY_DB;

// Create the Fredy schema — only the columns that matter here — plus the fixtures.
{
  const db = new Database(FREDY_DB);
  // lib/db.ts opens the Fredy database read-only and sets journal_mode = WAL, which
  // only works if the file is already in WAL mode.
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE listings (
     id TEXT PRIMARY KEY, created_at INTEGER, address TEXT, latitude REAL, longitude REAL,
     is_active INTEGER DEFAULT 1, manually_deleted INTEGER NOT NULL DEFAULT 0
   )`);
  const insert = db.prepare(
    `INSERT INTO listings(id, created_at, address, latitude, longitude, is_active, manually_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  // no coordinates at all (NULL)
  insert.run("a1", 500, "12345 Testtown, Northside", null, null, 1, 0);
  // Fredy's -1/-1 sentinel
  insert.run("a2", 400, "Beispielstraße 31, 12345 Testtown", -1, -1, 1, 0);
  // same address as a1, spelled differently → same cache key
  insert.run("a3", 300, "  12345   TESTTOWN, Northside ", null, null, 1, 0);
  insert.run("a4", 200, "Town centre, Othertown", null, null, 1, 0);
  // has real coordinates → not a candidate
  insert.run("b1", 100, "Alexanderplatz, Berlin", 52.5219, 13.4132, 1, 0);
  // inactive / deleted / blank address → not candidates
  insert.run("b2", 90, "Nowhere Lane 1, Testtown", null, null, 0, 0);
  insert.run("b3", 80, "Elsewhere Road 2, Testtown", null, null, 1, 1);
  insert.run("b4", 70, "   ", null, null, 1, 0);
  db.close();
}

const {
  geocodeMissing,
  listingsNeedingGeocode,
  lookupCachedCoords,
  normalizeAddressKey,
  storeCoords,
  storeMiss,
  MISS_RETRY_MS,
} = await import("./geocode-listings");
const { appDb } = await import("./db");

beforeEach(() => {
  appDb().prepare("DELETE FROM geocode_cache").run();
  appDb().prepare("DELETE FROM listing_deleted").run();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("normalizeAddressKey trims, folds whitespace and lowercases", () => {
  expect(normalizeAddressKey("  12345   Testtown,\tNorthside ")).toBe(
    "12345 testtown, northside",
  );
  expect(normalizeAddressKey("Beispielstraße 31")).toBe("beispielstraße 31");
  expect(normalizeAddressKey("   ")).toBe("");
});

test("cache round-trip: hits come back, misses do not", () => {
  storeCoords(normalizeAddressKey("12345 Testtown, Northside"), { lat: 48.83, lng: 9.16 });
  storeMiss(normalizeAddressKey("Town centre, Othertown"));

  const hits = lookupCachedCoords([
    "  12345 Testtown, NORTHSIDE  ",
    "Town centre, Othertown",
    "Never asked 1",
  ]);
  expect(hits.size).toBe(1);
  expect(hits.get("12345 testtown, northside")).toEqual({ lat: 48.83, lng: 9.16 });
  expect(hits.has("town centre, othertown")).toBe(false);
});

test("candidates: active listings without usable coordinates, one per address", () => {
  const pending = listingsNeedingGeocode(50);
  const ids = pending.map((p) => p.id);
  expect(ids).toEqual(["a1", "a2", "a4"]); // a3 shares its address with a1
  expect(ids).not.toContain("b1");
  expect(ids).not.toContain("b2");
  expect(ids).not.toContain("b3");
  expect(ids).not.toContain("b4");
});

test("candidates: addresses already resolved in the cache drop out", () => {
  storeCoords(normalizeAddressKey("12345 Testtown, Northside"), { lat: 48.83, lng: 9.16 });
  expect(listingsNeedingGeocode(50).map((p) => p.id)).toEqual(["a2", "a4"]);
});

test("candidates: recent misses are not re-asked, stale ones are", () => {
  const key = normalizeAddressKey("Town centre, Othertown");
  storeMiss(key);
  expect(listingsNeedingGeocode(50).map((p) => p.id)).toEqual(["a1", "a2"]);

  // age the miss artificially (older than 7 days)
  appDb()
    .prepare(`UPDATE geocode_cache SET resolved_at = ? WHERE address_key = ?`)
    .run(Date.now() - MISS_RETRY_MS - 1000, key);
  expect(listingsNeedingGeocode(50).map((p) => p.id)).toEqual(["a1", "a2", "a4"]);
});

test("candidates: soft-deleted listings are skipped", () => {
  appDb()
    .prepare(`INSERT INTO listing_deleted(listing_id, deleted_at) VALUES (?, ?)`)
    .run("a2", Date.now());
  expect(listingsNeedingGeocode(50).map((p) => p.id)).toEqual(["a1", "a4"]);
});

type FetchCall = { url: string; headers: Record<string, string> };

function stubFetch(responder: (url: string, calls: FetchCall[]) => Response): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return responder(url, calls);
  });
  return calls;
}

function hitResponse(lat: string, lon: string): Response {
  return new Response(JSON.stringify([{ lat, lon, display_name: "somewhere" }]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("geocodeMissing resolves, stores and reports progress", async () => {
  vi.useFakeTimers();
  try {
    const calls = stubFetch(() => hitResponse("48.8321", "9.1638"));
    const progress: [number, number][] = [];
    const run = geocodeMissing(3, (done, total) => progress.push([done, total]));
    await vi.runAllTimersAsync();
    const summary = await run;

    expect(summary).toEqual({ resolved: 3, missed: 0 });
    expect(calls.length).toBe(3);
    // Etiquette: a meaningful User-Agent + German language
    expect(calls[0].headers["User-Agent"]).toContain("ImmoFinder");
    expect(calls[0].headers["Accept-Language"]).toBe("de");
    // The country is appended when the address does not name one
    expect(decodeURIComponent(calls[0].url)).toContain(", Deutschland");
    expect(progress[0]).toEqual([0, 3]);
    expect(progress.at(-1)).toEqual([3, 3]);

    const hits = lookupCachedCoords(["12345 Testtown, Northside"]);
    expect(hits.get("12345 testtown, northside")).toEqual({ lat: 48.8321, lng: 9.1638 });
    // Everything resolved → nothing left pending
    expect(listingsNeedingGeocode(50)).toEqual([]);
  } finally {
    vi.useRealTimers();
  }
});

test("geocodeMissing records an empty response as a miss", async () => {
  vi.useFakeTimers();
  try {
    stubFetch(() => new Response("[]", { status: 200 }));
    const run = geocodeMissing(2);
    await vi.runAllTimersAsync();
    expect(await run).toEqual({ resolved: 0, missed: 2 });

    const rows = appDb()
      .prepare(`SELECT address_key, miss FROM geocode_cache ORDER BY address_key`)
      .all() as { address_key: string; miss: number }[];
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.miss === 1)).toBe(true);
    // Fresh misses are not asked again right away
    expect(listingsNeedingGeocode(50).map((p) => p.id)).toEqual(["a4"]);
  } finally {
    vi.useRealTimers();
  }
});

test("geocodeMissing respects the limit", async () => {
  vi.useFakeTimers();
  try {
    const calls = stubFetch(() => hitResponse("48.5", "9.2"));
    const run = geocodeMissing(1);
    await vi.runAllTimersAsync();
    expect(await run).toEqual({ resolved: 1, missed: 0 });
    expect(calls.length).toBe(1);
  } finally {
    vi.useRealTimers();
  }
});

test("geocodeMissing stops on HTTP 429 without asking again", async () => {
  vi.useFakeTimers();
  try {
    const calls = stubFetch((_url, made) =>
      made.length === 1 ? hitResponse("48.5", "9.2") : new Response("rate limited", { status: 429 }),
    );
    const run = geocodeMissing(3);
    await vi.runAllTimersAsync();
    expect(await run).toEqual({ resolved: 1, missed: 0 });
    expect(calls.length).toBe(2); // no further request after the 429
    // The aborted address stays open — no miss is recorded
    expect(listingsNeedingGeocode(50).map((p) => p.id)).toEqual(["a2", "a4"]);
  } finally {
    vi.useRealTimers();
  }
});
