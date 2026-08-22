// Read/write access to Fredy's scrape jobs through its API. Saving is a faithful
// round-trip: every original field is sent back, only the changed ones are replaced.

import { fredyApi, type FredyError } from "./fredy-api";

export type ProviderEntry = { id: string; url: string; enabled: boolean };
export type SpecFilter = { minRooms?: number; minSize?: number; maxPrice?: number } | null;

export type FredyJob = {
  id: string;
  name: string | null;
  enabled: boolean;
  provider: ProviderEntry[];
  blacklist: string[];
  notificationAdapter: unknown[];
  shared_with_user: string[];
  spatialFilter: unknown | null;
  specFilter: SpecFilter;
  running?: boolean;
  numberOfFoundListings?: number;
};

/** Payload for POST /api/jobs (upsert). shared_with_user → shareWithUsers. */
export type JobInput = {
  jobId?: string;
  name: string;
  enabled: boolean;
  provider: ProviderEntry[];
  blacklist: string[];
  notificationAdapter: unknown[];
  shareWithUsers: string[];
  spatialFilter: unknown | null;
  specFilter: SpecFilter;
};

export type Result<T> = { ok: true; data: T } | FredyError;

async function readJson<T>(r: Response): Promise<T | null> {
  try {
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function listJobs(): Promise<Result<FredyJob[]>> {
  const r = await fredyApi("/api/jobs");
  if (!r.ok) return r;
  if (!r.res.ok) return { ok: false, reason: "error", detail: `Loading jobs: HTTP ${r.res.status}` };
  const data = (await readJson<FredyJob[]>(r.res)) ?? [];
  return { ok: true, data };
}

export async function saveJob(job: JobInput): Promise<Result<null>> {
  const r = await fredyApi("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!r.ok) return r;
  if (!r.res.ok) {
    const t = (await r.res.text().catch(() => "")) ?? "";
    return { ok: false, reason: "error", detail: `Saving: HTTP ${r.res.status} ${t.slice(0, 200)}` };
  }
  return { ok: true, data: null };
}

export async function setJobEnabled(jobId: string, enabled: boolean): Promise<Result<null>> {
  const r = await fredyApi(`/api/jobs/${encodeURIComponent(jobId)}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: enabled }),
  });
  if (!r.ok) return r;
  if (!r.res.ok) return { ok: false, reason: "error", detail: `Status HTTP ${r.res.status}` };
  return { ok: true, data: null };
}

export async function runJob(jobId: string): Promise<Result<null> & { already?: boolean }> {
  const r = await fredyApi(`/api/jobs/${encodeURIComponent(jobId)}/run`, { method: "POST" });
  if (!r.ok) return r;
  if (r.res.status === 409) return { ok: true, data: null, already: true };
  if (r.res.status === 202 || r.res.ok) return { ok: true, data: null };
  return { ok: false, reason: "error", detail: `Run HTTP ${r.res.status}` };
}

export async function deleteJob(jobId: string): Promise<Result<null>> {
  const r = await fredyApi("/api/jobs", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  if (!r.ok) return r;
  if (!r.res.ok) return { ok: false, reason: "error", detail: `Deleting: HTTP ${r.res.status}` };
  return { ok: true, data: null };
}

// --- Scrape interval (Fredy general settings, admin) — faithful round-trip ---

export async function getScrapeInterval(): Promise<Result<number>> {
  const r = await fredyApi("/api/admin/generalSettings");
  if (!r.ok) return r;
  if (!r.res.ok) return { ok: false, reason: "error", detail: `Settings HTTP ${r.res.status}` };
  const s = (await readJson<{ interval?: string | number }>(r.res)) ?? {};
  const n = Number(s.interval);
  return { ok: true, data: Number.isFinite(n) && n > 0 ? n : 60 };
}

/** Interval plus the time of the last run (Fredy keeps lastRun globally, not per job). */
export async function getGeneralInfo(): Promise<Result<{ interval: number; lastRun: number | null }>> {
  const r = await fredyApi("/api/admin/generalSettings");
  if (!r.ok) return r;
  if (!r.res.ok) return { ok: false, reason: "error", detail: `Settings HTTP ${r.res.status}` };
  const s = (await readJson<{ interval?: string | number; lastRun?: number | string }>(r.res)) ?? {};
  const n = Number(s.interval);
  const last = Number(s.lastRun);
  return {
    ok: true,
    data: {
      interval: Number.isFinite(n) && n > 0 ? n : 60,
      lastRun: Number.isFinite(last) && last > 0 ? last : null,
    },
  };
}

export async function setScrapeInterval(minutes: number): Promise<Result<null>> {
  // Read the full settings, replace only `interval`, write everything back.
  const r = await fredyApi("/api/admin/generalSettings");
  if (!r.ok) return r;
  if (!r.res.ok) return { ok: false, reason: "error", detail: `Settings HTTP ${r.res.status}` };
  const current = (await readJson<Record<string, unknown>>(r.res)) ?? {};
  const body = { ...current, interval: String(Math.max(1, Math.floor(minutes))) };
  const w = await fredyApi("/api/admin/generalSettings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!w.ok) return w;
  if (!w.res.ok) return { ok: false, reason: "error", detail: `Interval: HTTP ${w.res.status}` };
  return { ok: true, data: null };
}
