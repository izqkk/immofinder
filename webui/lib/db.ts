import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// Both defaults are development conveniences — in Docker, compose sets the two
// environment variables explicitly. Relative paths are resolved against the working
// directory by `resolve` itself, which keeps `process.cwd()` out of the module graph.
const FREDY_DB_PATH = process.env.FREDY_DB_PATH ?? "../data/fredy/db/listings.db";

const APP_DB_PATH = process.env.WEBUI_DB_PATH ?? "data/webui.db";

let _fredy: Database.Database | null = null;
let _app: Database.Database | null = null;

/**
 * Fredy's listings database, opened strictly read-only: ImmoFinder never writes to it,
 * so a corrupted or half-migrated Fredy install can never be caused from this side.
 */
export function fredyDb(): Database.Database {
  if (_fredy) return _fredy;
  if (!existsSync(FREDY_DB_PATH)) {
    throw new Error(
      `Fredy database not found at ${FREDY_DB_PATH}. Set FREDY_DB_PATH or start Fredy first.`,
    );
  }
  _fredy = new Database(FREDY_DB_PATH, { readonly: true, fileMustExist: true });
  // Deliberately no `journal_mode = WAL` here. Fredy already runs its database in WAL
  // and SQLite reads that fine over a read-only handle — whereas *setting* the pragma
  // is a write, and would abort the very first request with SQLITE_READONLY whenever
  // the file is not in WAL mode yet (a restored backup, or a copy made with
  // `sqlite3 .backup`, both come back in `delete` mode).
  return _fredy;
}

const APP_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
     key   TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
  // The swipe decision for a listing. No row at all means "not seen yet" — that is
  // what feeds the swipe deck, so an absent row is meaningful, not missing data.
  `CREATE TABLE IF NOT EXISTS listing_status (
     listing_id TEXT PRIMARY KEY,
     status     TEXT NOT NULL CHECK(status IN ('shortlist','discarded','maybe')),
     decided_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_status_status ON listing_status(status)`,
  // Soft-delete is orthogonal to listing_status: a listing can be deleted while still
  // carrying a shortlist/maybe status, which is restored when the deletion is undone.
  `CREATE TABLE IF NOT EXISTS listing_deleted (
     listing_id TEXT PRIMARY KEY,
     deleted_at INTEGER NOT NULL
   )`,
  // "Contacted" marker, set once the advertiser has been written to. Also orthogonal
  // to listing_status — a shortlisted flat may or may not have been contacted.
  `CREATE TABLE IF NOT EXISTS listing_contacted (
     listing_id   TEXT PRIMARY KEY,
     contacted_at INTEGER NOT NULL
   )`,
  // Result of the availability check (per listing). 'gone' = the offer is no longer
  // reachable at its source URL; 'error' = the check failed (block / timeout / network),
  // which deliberately does not count as gone.
  `CREATE TABLE IF NOT EXISTS listing_availability (
     listing_id TEXT PRIMARY KEY,
     status     TEXT NOT NULL CHECK(status IN ('available','gone','error')),
     http_code  INTEGER,
     detail     TEXT,
     checked_at INTEGER NOT NULL
   )`,
  // Long-running work (scrape trigger, availability run, geocode back-fill) is tracked
  // here so the UI can poll a single endpoint and progress survives reloads.
  `CREATE TABLE IF NOT EXISTS background_tasks (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     kind       TEXT NOT NULL CHECK(kind IN ('scrape','availability','geocode')),
     state      TEXT NOT NULL CHECK(state IN ('running','done','error')),
     started_at INTEGER NOT NULL,
     ended_at   INTEGER,
     done       INTEGER NOT NULL DEFAULT 0,
     total      INTEGER NOT NULL DEFAULT 0,
     result     TEXT,
     error      TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_bg_kind_started ON background_tasks(kind, started_at DESC)`,
  // Coordinates resolved by us for listings Fredy delivers without usable ones. Keyed
  // by the *normalised address*, not the listing — many listings share an address.
  // miss = 1 records that the geocoder found nothing, so we stop asking for a while.
  `CREATE TABLE IF NOT EXISTS geocode_cache (
     address_key TEXT PRIMARY KEY,
     lat         REAL,
     lng         REAL,
     resolved_at INTEGER NOT NULL,
     miss        INTEGER NOT NULL DEFAULT 0
   )`,
];

/**
 * ImmoFinder's own database: everything Fredy does not know about — swipe decisions,
 * settings, soft deletes, availability results, the geocode cache.
 *
 * The schema is created on first open, so a fresh install needs no migration step and
 * no seed data. The directory is created too, which is what makes an empty Docker
 * volume work out of the box.
 */
export function appDb(): Database.Database {
  if (_app) return _app;
  mkdirSync(dirname(APP_DB_PATH), { recursive: true });
  _app = new Database(APP_DB_PATH);
  _app.pragma("journal_mode = WAL");
  _app.pragma("foreign_keys = ON");
  for (const stmt of APP_SCHEMA) _app.prepare(stmt).run();
  return _app;
}
