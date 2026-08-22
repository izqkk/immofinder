// Shared, authenticated connection to Fredy's Fastify API.
// Fredy uses cookie session auth: POST /api/login (→ cookie fredy-admin-session), after
// which requests carry that cookie. Credentials come from the environment.

export type FredyError = {
  ok: false;
  reason: "not_configured" | "auth_failed" | "error";
  detail?: string;
};

const BASE = process.env.FREDY_API_URL ?? "http://fredy:9998";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Connection failed";
}

/** Logs in to Fredy and returns the session cookie (name=value) or an error. */
async function login(): Promise<string | FredyError> {
  const username = process.env.FREDY_API_USER;
  const password = process.env.FREDY_API_PASSWORD;
  if (!username || !password) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    if (res.status !== 200) return { ok: false, reason: "auth_failed", detail: `Login HTTP ${res.status}` };
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return { ok: false, reason: "auth_failed", detail: "No session returned" };
    return setCookie.split(";")[0];
  } catch (e) {
    return { ok: false, reason: "error", detail: msg(e) };
  }
}

/** Authenticated fetch against Fredy's API. Returns the response or a FredyError. */
export async function fredyApi(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; res: Response } | FredyError> {
  const cookie = await login();
  if (typeof cookie !== "string") return cookie;
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), Cookie: cookie },
      cache: "no-store",
    });
    return { ok: true, res };
  } catch (e) {
    return { ok: false, reason: "error", detail: msg(e) };
  }
}

export function isFredyConfigured(): boolean {
  return Boolean(process.env.FREDY_API_USER && process.env.FREDY_API_PASSWORD);
}
