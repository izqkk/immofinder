"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireSession } from "@/lib/session";
import {
  deleteListings,
  getListing,
  restoreDeleted,
  setContacted,
  setListingStatus,
} from "@/lib/listings";
import { checkAllAvailability, type CheckSummary } from "@/lib/availability";
import {
  countListingsSince,
  failTask,
  finishTask,
  latestTask,
  runningTask,
  startTask,
  updateProgress,
} from "@/lib/background-tasks";
import { getSettings, setSettings } from "@/lib/settings";
import { geocodeAddress } from "@/lib/geocode";
import { countPendingGeocode, geocodeMissing, type GeocodeRunSummary } from "@/lib/geocode-listings";
import { triggerFredyScrape, type TriggerResult } from "@/lib/fredy-trigger";
import {
  deleteJob,
  getScrapeInterval,
  listJobs,
  runJob,
  saveJob,
  setJobEnabled,
  setScrapeInterval,
  type JobInput,
} from "@/lib/fredy-jobs";
import {
  detectProvider,
  findRejectedImmoscoutParam,
  immoscoutWebToMobile,
  IMMOSCOUT_412_FALLBACK_KEY,
  PROVIDER_LABELS,
  UNKNOWN_PROVIDER_KEY,
  type SearchProvider,
  type SearchUrlMessage,
} from "@/lib/search-url";
import { SORT_KEYS, SWIPE_DECK_SORTS } from "@/lib/types";
import type { ListingStatus, Settings } from "@/lib/types";

const VALID_STATUSES: ListingStatus[] = ["unseen", "shortlist", "maybe", "discarded"];

/**
 * Log out — clears the session cookie and sends the browser back to the login form.
 * The only action without `requireSession()`: it only ever gives rights up, never
 * hands any out.
 */
export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

function assertValidListing(listingId: string) {
  if (typeof listingId !== "string" || listingId.length === 0 || listingId.length > 64) {
    throw new Error("Invalid listing id");
  }
  if (!getListing(listingId)) throw new Error("Listing not found");
}

/** Lightweight id-shape check for bulk operations (no per-id DB round-trip). */
function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) throw new Error("Invalid listing ids");
  const out = ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64,
  );
  if (out.length === 0) throw new Error("No valid listing ids");
  if (out.length > 500) throw new Error("Too many listings");
  return out;
}

function revalidateListingViews() {
  revalidatePath("/listings");
  revalidatePath("/swipe");
  revalidatePath("/search");
  revalidatePath("/");
}

/** Set/clear the "contacted" marker (card in the overview + the detail page). */
export async function setContactedAction(
  listingId: string,
  contacted: boolean,
): Promise<{ ok: true; contacted: boolean }> {
  await requireSession();
  assertValidListing(listingId);
  const next = Boolean(contacted);
  setContacted(listingId, next);

  revalidatePath("/listings");
  revalidatePath("/swipe");
  revalidatePath("/search");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  return { ok: true, contacted: next };
}

export type SwipeResult = {
  ok: true;
};

export async function setListingStatusAction(
  listingId: string,
  status: ListingStatus,
): Promise<SwipeResult> {
  await requireSession();
  assertValidListing(listingId);
  if (!VALID_STATUSES.includes(status)) throw new Error("Invalid status");

  setListingStatus(listingId, status);

  revalidatePath("/swipe");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  return { ok: true };
}

/** Soft-delete a single listing (e.g. the trash button on a saved card). */
export async function deleteListingAction(listingId: string) {
  await requireSession();
  assertValidListing(listingId);
  deleteListings([listingId]);
  revalidateListingViews();
  revalidatePath(`/listings/${listingId}`);
}

/** Bulk soft-delete from the selection mode on /listings. */
export async function bulkDeleteAction(listingIds: string[]): Promise<{ deleted: number }> {
  await requireSession();
  const ids = sanitizeIds(listingIds);
  deleteListings(ids);
  revalidateListingViews();
  return { deleted: ids.length };
}

/** Restore one or more soft-deleted listings (undo / the "deleted" tab). */
export async function restoreDeletedAction(listingIds: string[]): Promise<{ restored: number }> {
  await requireSession();
  const ids = sanitizeIds(listingIds);
  restoreDeleted(ids);
  revalidateListingViews();
  for (const id of ids) revalidatePath(`/listings/${id}`);
  return { restored: ids.length };
}

function sanitizeSettings(patch: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};

  // Hard filters (0 = off); invalid → 0
  const intGE0 = (v: unknown, max: number): number => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : 0;
  };
  // Values with a mandatory range; invalid → clamped into that range
  const intIn = (v: unknown, lo: number, hi: number, def: number): number => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
  };
  const str = (v: unknown, max: number): string => String(v).slice(0, max);

  const strings: [keyof Settings, number][] = [
    ["excludeKeywords", 500],
    ["excludeAddressKeywords", 500],
    ["requireKeywords", 500],
    ["highlightKeywords", 500],
    ["singleRoomPatterns", 1000],
    ["filterProviders", 200],
    ["startAddress", 200],
  ];
  for (const [key, max] of strings) {
    if (patch[key] !== undefined) (out[key] as string) = str(patch[key], max);
  }

  const booleans: (keyof Settings)[] = [
    "hideSingleRoom",
    "hideSingleRoomByTitle",
    "excludeKeywordsInAddress",
    "excludeUnknownPrice",
    "excludeUnknownRooms",
    "excludeUnknownSize",
    "excludeUnknownDistance",
    "scoreSingleRoomFloor",
    "sharedRoomMode",
  ];
  for (const key of booleans) {
    if (patch[key] !== undefined) (out[key] as boolean) = Boolean(patch[key]);
  }

  const clamped: [keyof Settings, number, number, number][] = [
    ["voterCount", 1, 20, 1],
    ["scoringMaxBudget", 100, 1000000, 100],
    ["scoringMaxDistanceKm", 1, 200, 1],
    ["scoreWeightPrice", 0, 100, 40],
    ["scoreWeightDistance", 0, 100, 35],
    ["scoreWeightRooms", 0, 100, 15],
    ["scoreWeightSize", 0, 100, 10],
    ["scoreBudgetTolerancePct", 0, 200, 25],
    ["scoreRoomsIdealPct", 0, 100, 100],
    ["scoreRoomsOkPct", 0, 100, 70],
    ["scoreRoomsTightPct", 0, 100, 20],
    ["scoreSqmGoodThreshold", 1, 200, 30],
    ["scoreSqmOkThreshold", 1, 200, 20],
    ["scoreSqmGoodPct", 0, 100, 100],
    ["scoreSqmOkPct", 0, 100, 70],
    ["scoreSqmTightPct", 0, 100, 30],
    ["scoreNeutralPct", 0, 100, 50],
    ["scoreMaxPlausibleRooms", 1, 50, 12],
    ["displayGoodScore", 1, 5, 4],
    ["displayWeakScore", 0, 5, 2],
    ["displayDashboardTopN", 1, 24, 6],
    ["swipeDeckSize", 1, 500, 50],
    ["loadLimit", 100, 10000, 2000],
  ];
  for (const [key, lo, hi, def] of clamped) {
    if (patch[key] !== undefined) (out[key] as number) = intIn(patch[key], lo, hi, def);
  }

  const zeroOff: [keyof Settings, number][] = [
    ["filterMinPrice", 100000],
    ["filterMaxPrice", 100000],
    ["filterMinRooms", 20],
    ["filterMaxRooms", 20],
    ["filterMinSize", 1000],
    ["filterMaxSize", 1000],
    ["filterMinSqmPerPerson", 200],
    ["filterMaxAgeDays", 3650],
    ["filterMaxDistanceKm", 500],
  ];
  for (const [key, max] of zeroOff) {
    if (patch[key] !== undefined) (out[key] as number) = intGE0(patch[key], max);
  }

  // Enum fields: only let valid values through
  if (patch.swipeDeckSort !== undefined)
    out.swipeDeckSort = SWIPE_DECK_SORTS.includes(patch.swipeDeckSort) ? patch.swipeDeckSort : "score";
  if (patch.defaultSort !== undefined)
    out.defaultSort = SORT_KEYS.includes(patch.defaultSort) ? patch.defaultSort : "score";

  // Start location
  if (patch.startLat !== undefined) {
    const n = Number(patch.startLat);
    out.startLat = Number.isFinite(n) && n >= -90 && n <= 90 ? n : 0;
  }
  if (patch.startLng !== undefined) {
    const n = Number(patch.startLng);
    out.startLng = Number.isFinite(n) && n >= -180 && n <= 180 ? n : 0;
  }
  return out;
}

export async function saveSettingsAction(patch: Partial<Settings>) {
  await requireSession();
  const clean = sanitizeSettings(patch);

  // Fallback geocoding: address set but no (valid) coordinates → resolve it once.
  const addr = clean.startAddress?.trim();
  const noCoords = !clean.startLat && !clean.startLng;
  if (addr && noCoords) {
    const current = getSettings();
    const addressChanged = addr !== current.startAddress.trim();
    const currentHasCoords = current.startLat !== 0 || current.startLng !== 0;
    if (addressChanged || !currentHasCoords) {
      const geo = await geocodeAddress(addr);
      if (geo) {
        clean.startLat = geo.lat;
        clean.startLng = geo.lng;
      }
    } else {
      // Address unchanged → keep the coordinates we already have
      clean.startLat = current.startLat;
      clean.startLng = current.startLng;
    }
  }

  setSettings(clean);
  revalidatePath("/settings");
  revalidateListingViews();
}

// --- Background jobs: one poll endpoint for scraping and availability ---

export type ScrapeTriggerResult = TriggerResult | { ok: false; reason: "already_running"; detail?: string };

export type BackgroundStatus = {
  scrape: { running: boolean; jobs: number; startedAt: number | null; newListings: number };
  availability: {
    running: boolean;
    done: number;
    total: number;
    finishedAt: number | null;
    gone: number;
  };
  geocode: {
    running: boolean;
    done: number;
    total: number;
    finishedAt: number | null;
    resolved: number;
  };
};

// Fredy only reports `running` once the run has actually started. Within this grace
// period a freshly started scrape task counts as running even without the job flag.
const SCRAPE_START_GRACE_MS = 25_000;

/** How many addresses a background run looks up at most (1 request per second). */
const GEOCODE_BATCH = 200;

/** `endedAt` of the availability run we last checked for outstanding addresses. */
let lastGeocodeCheckFor: number | null = null;

/** Starts the availability run decoupled from the request (deliberately not awaited). */
function startAvailabilityRun(): void {
  if (runningTask("availability")) return;
  const task = startTask("availability");
  void checkAllAvailability((done, total) => updateProgress(task.id, done, total))
    .then((summary) => finishTask(task.id, summary))
    .catch((err) => failTask(task.id, String(err)));
}

/** Looks up addresses without coordinates — decoupled from the request (not awaited). */
function startGeocodeRun(): void {
  if (runningTask("geocode")) return;
  if (countPendingGeocode(1) === 0) return;
  const task = startTask("geocode");
  void geocodeMissing(GEOCODE_BATCH, (done, total) => updateProgress(task.id, done, total))
    .then((summary) => finishTask(task.id, summary))
    .catch((err) => failTask(task.id, String(err)));
}

/** Kicks off a scrape run in the Fredy container (all jobs). Does not block. */
export async function triggerScrapeAction(): Promise<ScrapeTriggerResult> {
  await requireSession();
  const open = runningTask("scrape");
  if (open) {
    const jobs = await listJobs();
    const active = jobs.ok && jobs.data.some((j) => j.running === true);
    const fresh = Date.now() - open.startedAt < SCRAPE_START_GRACE_MS;
    if (active || fresh) return { ok: false, reason: "already_running" };
    // Orphaned task (Fredy reports nothing any more) → close it out and start afresh.
    finishTask(open.id, { newListings: countListingsSince(open.startedAt) });
  }

  const task = startTask("scrape");
  const res = await triggerFredyScrape();
  if (!res.ok) failTask(task.id, res.detail ?? res.reason);
  return res;
}

/** The status bar's only poll endpoint. It also detects the transition from
 *  "scrape running" to "scrape finished" and then kicks off the availability run. */
export async function getBackgroundStatusAction(): Promise<BackgroundStatus> {
  await requireSession();
  const jobs = await listJobs();
  const runningJobs = jobs.ok ? jobs.data.filter((j) => j.running === true).length : 0;

  const scrapeTask = latestTask("scrape");
  const startedAt = scrapeTask?.startedAt ?? null;
  const newListings = startedAt == null ? 0 : countListingsSince(startedAt);

  let scrapeRunning = runningJobs > 0;
  if (scrapeTask?.state === "running") {
    const fresh = Date.now() - scrapeTask.startedAt < SCRAPE_START_GRACE_MS;
    if (runningJobs > 0 || fresh) {
      scrapeRunning = true;
    } else if (jobs.ok) {
      // Transition detected: Fredy no longer reports a running job.
      finishTask(scrapeTask.id, { newListings });
      scrapeRunning = false;
      startAvailabilityRun();
    } else {
      // Fredy unreachable → leave the state as it is and start nothing.
      scrapeRunning = true;
    }
  }

  const availTask = latestTask("availability");
  const availRunning = availTask?.state === "running";

  // Transition "availability finished" → look up the addresses without coordinates.
  // Checked exactly once per completed availability run, so the poll does not scan the
  // Fredy table on every tick.
  if (!availRunning && availTask?.state === "done" && availTask.endedAt != null) {
    const geocodeTask = latestTask("geocode");
    const alreadyRan = geocodeTask != null && geocodeTask.startedAt >= availTask.endedAt;
    if (!alreadyRan && lastGeocodeCheckFor !== availTask.endedAt) {
      lastGeocodeCheckFor = availTask.endedAt;
      startGeocodeRun();
    }
  }

  let gone = 0;
  if (availTask?.state === "done" && availTask.result) {
    try {
      gone = Number((JSON.parse(availTask.result) as CheckSummary | null)?.gone ?? 0);
    } catch {
      gone = 0;
    }
  }

  const geoTask = latestTask("geocode");
  let resolved = 0;
  if (geoTask?.state === "done" && geoTask.result) {
    try {
      resolved = Number((JSON.parse(geoTask.result) as GeocodeRunSummary | null)?.resolved ?? 0);
    } catch {
      resolved = 0;
    }
  }

  return {
    scrape: { running: scrapeRunning, jobs: runningJobs, startedAt, newListings },
    availability: {
      running: availRunning,
      done: availTask?.done ?? 0,
      total: availTask?.total ?? 0,
      finishedAt: availTask?.state === "done" ? availTask.endedAt : null,
      gone: Number.isFinite(gone) ? gone : 0,
    },
    geocode: {
      running: geoTask?.state === "running",
      done: geoTask?.done ?? 0,
      total: geoTask?.total ?? 0,
      finishedAt: geoTask?.state === "done" ? geoTask.endedAt : null,
      resolved: Number.isFinite(resolved) ? resolved : 0,
    },
  };
}

// --- Fredy job management (scrape configuration) ---

export async function fredyListJobsAction() {
  await requireSession();
  return listJobs();
}

/** Saves (upserts) a job. Light validation; the faithful round-trip comes from the client. */
export async function fredySaveJobAction(job: JobInput) {
  await requireSession();
  const clean: JobInput = {
    jobId: job.jobId,
    name: String(job.name ?? "").slice(0, 200),
    enabled: Boolean(job.enabled),
    provider: (Array.isArray(job.provider) ? job.provider : [])
      .map((p) => ({ id: String(p.id), url: String(p.url).trim(), enabled: p.enabled !== false }))
      .filter((p) => p.url.length > 0),
    blacklist: (Array.isArray(job.blacklist) ? job.blacklist : [])
      .map((b) => String(b).trim())
      .filter(Boolean),
    notificationAdapter: Array.isArray(job.notificationAdapter) ? job.notificationAdapter : [],
    shareWithUsers: Array.isArray(job.shareWithUsers) ? job.shareWithUsers : [],
    spatialFilter: job.spatialFilter ?? null,
    specFilter: job.specFilter ?? null,
  };
  const res = await saveJob(clean);
  revalidatePath("/scrape");
  return res;
}

export async function fredySetJobEnabledAction(jobId: string, enabled: boolean) {
  await requireSession();
  const res = await setJobEnabled(jobId, enabled);
  revalidatePath("/scrape");
  return res;
}

export async function fredyRunJobAction(jobId: string) {
  await requireSession();
  return runJob(jobId);
}

export async function fredyDeleteJobAction(jobId: string) {
  await requireSession();
  const res = await deleteJob(jobId);
  revalidatePath("/scrape");
  return res;
}

export async function fredySetIntervalAction(minutes: number) {
  await requireSession();
  const res = await setScrapeInterval(minutes);
  revalidatePath("/scrape");
  return res;
}

export async function fredyGetIntervalAction() {
  await requireSession();
  return getScrapeInterval();
}

// --- Validating a portal search address (the wizard on /scrape) ---

export type ValidateSearchUrlResult =
  | { ok: true; provider: SearchProvider; label: string; hits: number | null; exact: boolean }
  | ({ ok: false } & SearchUrlMessage);

const VALIDATE_TIMEOUT_MS = 15_000;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function totalFromMobileBody(body: Record<string, unknown>): number | null {
  for (const key of ["totalResults", "numberOfHits", "resultCount", "totalHits"]) {
    const value = body[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Checks a pasted search address the same way Fredy goes about scraping it: ImmoScout
 * through the mobile API (POST /search/list), every other portal through a plain fetch.
 * Failures come back as a dictionary key (`actions.searchUrl.*`) plus its variables —
 * whole sentences that, for the known HTTP 412 cases, name the offending parameter.
 */
export async function validateSearchUrlAction(url: string): Promise<ValidateSearchUrlResult> {
  await requireSession();
  const raw = String(url ?? "")
    .trim()
    .slice(0, 4000);
  const provider = detectProvider(raw);
  if (!provider) return { ok: false, reason: UNKNOWN_PROVIDER_KEY };
  const label = PROVIDER_LABELS[provider];

  if (provider === "immoscout") {
    const rejected = findRejectedImmoscoutParam(raw);
    if (rejected) return { ok: false, ...rejected };

    const translated = immoscoutWebToMobile(raw);
    if (!translated.ok) return translated;

    let res: Response;
    try {
      res = await fetch(translated.url, {
        method: "POST",
        headers: {
          "User-Agent": "ImmoScout_27.12_26.2_._",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ supportedResultListTypes: [], userData: {} }),
        signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
      });
    } catch {
      return { ok: false, reason: "actions.searchUrl.unreachable" };
    }

    if (res.status === 412) return { ok: false, reason: IMMOSCOUT_412_FALLBACK_KEY };
    if (!res.ok) {
      return {
        ok: false,
        reason: "actions.searchUrl.httpErrorImmoscout",
        reasonVars: { status: res.status },
      };
    }

    let body: Record<string, unknown>;
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      return { ok: false, reason: "actions.searchUrl.unparsableResponse" };
    }
    const items = Array.isArray(body.resultListItems) ? body.resultListItems : [];
    const onPage = items.filter(
      (item) => (item as { type?: string } | null)?.type === "EXPOSE_RESULT",
    ).length;
    const total = totalFromMobileBody(body);
    return { ok: true, provider, label, hits: total ?? onPage, exact: total != null };
  }

  let res: Response;
  try {
    res = await fetch(raw, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "actions.searchUrl.unreachable" };
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: "actions.searchUrl.httpError",
      reasonVars: { status: res.status },
    };
  }
  return { ok: true, provider, label, hits: null, exact: false };
}

/** Geocodes an address (for the "find coordinates" button on the settings page). */
export async function geocodeStartAction(
  address: string,
): Promise<{ ok: true; lat: number; lng: number; displayName: string } | { ok: false }> {
  await requireSession();
  const geo = await geocodeAddress(String(address).slice(0, 200));
  if (!geo) return { ok: false };
  return { ok: true, lat: geo.lat, lng: geo.lng, displayName: geo.displayName };
}
