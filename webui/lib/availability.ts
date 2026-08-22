import { loadCheckableListings, saveAvailabilityResults } from "./listings";
import type { AvailabilityStatus, RawListing } from "./types";

// IS24 web URLs return 401 behind DataDome — the mobile API is the only reliable
// reachability probe (see feedback-scraping-strategy memory). UA must look like the app.
const IS24_UA = "ImmoScout_27.12_26.2_._";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 8000;
// The run happens in the background, not inside a request — gentle beats fast.
const CONCURRENCY = 4;

export type CheckResult = {
  listingId: string;
  status: AvailabilityStatus;
  httpCode: number | null;
  detail: string | null;
};

export type CheckSummary = {
  checked: number;
  available: number;
  gone: number;
  error: number;
};

function classify(httpCode: number): AvailabilityStatus {
  if (httpCode === 404 || httpCode === 410) return "gone";
  if (httpCode >= 200 && httpCode < 400) return "available";
  // 401/403/429/5xx → can't tell reliably; treat as error, not "gone"
  return "error";
}

async function fetchStatus(url: string, ua: string): Promise<{ code: number | null; detail: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": ua, Accept: "*/*" },
    });
    // We only need the status line — drop the body without buffering it.
    res.body?.cancel().catch(() => {});
    return { code: res.status, detail: res.status >= 400 ? `HTTP ${res.status}` : null };
  } catch (e) {
    const msg = e instanceof Error ? e.name : "fetch failed";
    return { code: null, detail: msg === "AbortError" ? "Timeout" : msg };
  } finally {
    clearTimeout(timer);
  }
}

async function checkOne(listing: RawListing): Promise<CheckResult> {
  if (listing.provider === "immoscout") {
    const m = listing.link.match(/\/expose\/(\d+)/);
    if (!m) return { listingId: listing.id, status: "error", httpCode: null, detail: "No expose id" };
    const { code, detail } = await fetchStatus(
      `https://api.mobile.immobilienscout24.de/expose/${m[1]}`,
      IS24_UA,
    );
    return {
      listingId: listing.id,
      status: code == null ? "error" : classify(code),
      httpCode: code,
      detail,
    };
  }

  const { code, detail } = await fetchStatus(listing.link, BROWSER_UA);
  return {
    listingId: listing.id,
    status: code == null ? "error" : classify(code),
    httpCode: code,
    detail,
  };
}

/** Run an async mapper over items with a fixed concurrency cap. */
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onDone?: (done: number, total: number) => void,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  let finished = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
      finished++;
      onDone?.(finished, items.length);
    }
  });
  await Promise.all(workers);
  return out;
}

export type ProgressCallback = (done: number, total: number) => void;

/** Check every active listing's source URL and persist the result. */
export async function checkAllAvailability(onProgress?: ProgressCallback): Promise<CheckSummary> {
  const listings = loadCheckableListings();
  onProgress?.(0, listings.length);
  const results = await pool(listings, CONCURRENCY, checkOne, onProgress);
  saveAvailabilityResults(results);
  return {
    checked: results.length,
    available: results.filter((r) => r.status === "available").length,
    gone: results.filter((r) => r.status === "gone").length,
    error: results.filter((r) => r.status === "error").length,
  };
}
