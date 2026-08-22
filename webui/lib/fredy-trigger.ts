// Triggers a scrape run in the Fredy container (all jobs) through its API.

import { fredyApi, type FredyError } from "./fredy-api";

export type TriggerResult = { ok: true } | FredyError;

export async function triggerFredyScrape(): Promise<TriggerResult> {
  const r = await fredyApi("/api/jobs/startAll", { method: "POST" });
  if (!r.ok) return r;
  if (r.res.status === 202 || r.res.ok) return { ok: true };
  return { ok: false, reason: "error", detail: `startAll HTTP ${r.res.status}` };
}
