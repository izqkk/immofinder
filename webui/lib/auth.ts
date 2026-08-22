/**
 * Shared-password gate — pure building blocks (no Next.js imports).
 *
 * The app has no user accounts: one password (`APP_PASSWORD`) for everyone, and a
 * signed session cookie (`AUTH_SECRET`) that proves "this browser knew the password".
 * The cookie carries no secret and no password — only `issuedAt|expiresAt|fingerprint`
 * plus an HMAC-SHA256 over exactly that payload. The fingerprint is a truncated
 * SHA-256 of the current `APP_PASSWORD`, so changing the password invalidates every
 * cookie that is already out there.
 *
 * Everything here is deliberately free of `next/headers` so it can be unit-tested
 * (see `lib/auth.test.ts`) and imported from both the proxy (middleware) and the
 * server-side code paths. Cookie/session plumbing lives in `lib/session.ts`.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Cookie name for plain http (local development). */
export const SESSION_COOKIE = "immofinder_session";

/**
 * Cookie name used whenever the cookie is set with `Secure`. The `__Host-` prefix is
 * enforced by browsers: such a cookie is only accepted when it is Secure, Path=/ and
 * carries no Domain — exactly how we set it. That makes it impossible for a sibling
 * subdomain (or a plaintext MITM) to plant or overwrite the session cookie.
 */
export const SESSION_COOKIE_SECURE = "__Host-immofinder_session";

/** Both names, most specific first — readers must accept whichever is present. */
export const SESSION_COOKIE_NAMES = [SESSION_COOKIE_SECURE, SESSION_COOKIE] as const;

/** 30 days. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const MIN_SECRET_LENGTH = 32;

/** Minimum length for the shared password — anything shorter counts as unconfigured. */
export const MIN_PASSWORD_LENGTH = 12;

export type SessionPayload = { issuedAt: number; expiresAt: number; fingerprint: string };

export class AuthConfigError extends Error {}

/** Cookie name to use when writing the session cookie. */
export function sessionCookieName(secure: boolean): string {
  return secure ? SESSION_COOKIE_SECURE : SESSION_COOKIE;
}

/**
 * Is *this request* running over a secure transport?
 *
 * Decided per request, never from `NODE_ENV`. A self-hosted instance is commonly
 * reached over plain http on a private network address first and only gets TLS later,
 * and a `Secure` cookie is never sent back over http — the gate would accept the
 * password and then bounce every follow-up request straight to /login.
 *
 * Rules: an https URL means secure; `x-forwarded-proto: https` means secure only
 * with `TRUST_PROXY=1`, because anyone reaching the container directly can forge it.
 *
 * The header is checked FIRST when it is present, because Next itself folds
 * `x-forwarded-proto` into the request URL (`resolve-routes.js`:
 * `socket.encrypted || headers['x-forwarded-proto'].includes('https')`), so a
 * forged header would otherwise sneak in through `request.url`. Present but
 * untrusted → not secure; the URL is only believed when no such header exists (then
 * its scheme comes straight from the socket).
 *
 * Worst case of getting it wrong is an unusable cookie, never an unearned session:
 * a forged header can only make the cookie `Secure` (withholding access), never
 * grant one. Corner case worth knowing: TLS terminated *by the app* while an
 * untrusted `x-forwarded-proto: http` is present yields a non-`Secure` cookie —
 * set `TRUST_PROXY=1` whenever a proxy sits in front, which is the documented setup.
 */
export function isSecureRequest(
  url: string | URL | null | undefined,
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const forwarded = headers.get("x-forwarded-proto");
  if (forwarded) {
    if (env.TRUST_PROXY !== "1") return false;
    // A chain of proxies may append; the left-most entry is the original scheme.
    return forwarded.split(",")[0].trim().toLowerCase() === "https";
  }
  // `null` is legitimate: a server action sees headers but no request URL.
  if (url == null) return false;
  try {
    const parsed = typeof url === "string" ? new URL(url) : url;
    return parsed.protocol === "https:";
  } catch {
    return false; // unparsable URL → assume plaintext
  }
}

/**
 * `REQUIRE_HTTPS=1` — refuse to hand out a session over a non-secure request.
 * Leave it off while the app is reachable over plain http; switch it on once it is
 * served over https only, so a misconfigured reverse proxy can never silently
 * downgrade the gate.
 */
export function requiresHttps(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.REQUIRE_HTTPS === "1";
}

/**
 * Reads the session cookie no matter which of the two names it carries. `get` is
 * whatever the caller has at hand (`request.cookies.get`, `cookies()`, …).
 */
export function readSessionCookie(
  get: (name: string) => string | undefined,
): string | undefined {
  for (const name of SESSION_COOKIE_NAMES) {
    const value = get(name);
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

// --- configuration -------------------------------------------------------

/**
 * The shared password. Throws when unset or shorter than {@link MIN_PASSWORD_LENGTH}
 * — callers must let that bubble up so the app refuses access instead of falling open
 * on a misconfigured deployment. A four-character shared password is not a gate.
 */
export function getAppPassword(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.APP_PASSWORD;
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    throw new AuthConfigError(
      `APP_PASSWORD is missing or shorter than ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
  return value;
}

/** Signing key for the session cookie. Throws when unset or too short. */
export function getAuthSecret(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.AUTH_SECRET;
  if (typeof value !== "string" || value.length < MIN_SECRET_LENGTH) {
    throw new AuthConfigError(
      `AUTH_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return value;
}

/** True when both required secrets are present and well-formed. */
export function isAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    getAppPassword(env);
    getAuthSecret(env);
    return true;
  } catch {
    return false;
  }
}

// --- password fingerprint ------------------------------------------------

/**
 * Short, non-reversible marker of the password a session was issued for: 16 hex
 * chars (64 bit) of SHA-256. Enough that two passwords practically never collide,
 * and useless to whoever steals a cookie — recovering the password from it means
 * brute-forcing the password itself, which is cheaper against the login form.
 */
export function passwordFingerprint(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("hex").slice(0, 16);
}

/** Fingerprint of the currently configured password. Throws when unconfigured. */
export function currentPasswordFingerprint(env: NodeJS.ProcessEnv = process.env): string {
  return passwordFingerprint(getAppPassword(env));
}

// --- token ---------------------------------------------------------------

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function isUsableSecret(secret: unknown): secret is string {
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}

/** HMAC over the payload. Refuses to sign with a missing or too-short secret. */
function sign(payload: string, secret: string): string {
  if (!isUsableSecret(secret)) {
    throw new AuthConfigError(
      `refusing to sign: secret is missing or shorter than ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

/**
 * Constant-time comparison of two strings of arbitrary length. Both sides are
 * hashed first, so differing lengths neither throw nor leak via timing.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/** `base64url(issuedAt|expiresAt|fingerprint).base64url(hmac)` — no secrets in the value. */
export function createSessionToken(
  secret: string,
  fingerprint: string,
  now: number = Date.now(),
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): string {
  if (!/^[0-9a-f]{16}$/.test(fingerprint)) {
    throw new AuthConfigError("invalid password fingerprint");
  }
  const payload = `${now}|${now + maxAgeSeconds * 1000}|${fingerprint}`;
  return `${b64url(Buffer.from(payload, "utf8"))}.${sign(payload, secret)}`;
}

/**
 * Verifies signature, expiry and password fingerprint. Returns the payload or `null`
 * — never throws on attacker-controlled input (malformed, tampered, wrong secret,
 * expired, or issued for a password that has since been changed). A missing or
 * too-short secret also yields `null`: on a broken config nobody is authenticated.
 */
export function verifySessionToken(
  token: unknown,
  secret: string,
  expectedFingerprint: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!isUsableSecret(secret)) return null;
  if (typeof expectedFingerprint !== "string" || expectedFingerprint.length === 0) return null;
  if (typeof token !== "string" || token.length === 0 || token.length > 512) return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const encodedPayload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (encodedPayload.includes(".") || signature.includes(".")) return null;

  let payload: string;
  try {
    const raw = Buffer.from(encodedPayload, "base64url");
    // Reject anything that is not a faithful base64url round-trip (padding tricks).
    if (b64url(raw) !== encodedPayload) return null;
    payload = raw.toString("utf8");
  } catch {
    return null;
  }

  if (!constantTimeEquals(sign(payload, secret), signature)) return null;

  const parts = payload.split("|");
  if (parts.length !== 3) return null;
  const issuedAt = Number(parts[0]);
  const expiresAt = Number(parts[1]);
  const fingerprint = parts[2];
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return null;
  if (expiresAt <= issuedAt) return null;
  if (now >= expiresAt) return null;
  // Password changed since the cookie was issued → the session is dead.
  if (!constantTimeEquals(fingerprint, expectedFingerprint)) return null;

  return { issuedAt, expiresAt, fingerprint };
}

// --- password ------------------------------------------------------------

/** Constant-time password check against `APP_PASSWORD`. */
export function verifyPassword(
  candidate: unknown,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = getAppPassword(env); // throws when unset/too short → no fall-open
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  if (candidate.length > 1024) return false;
  return constantTimeEquals(candidate, expected);
}

// --- redirect target -----------------------------------------------------

/**
 * Validates a `?next=` value: only same-origin paths. Rejects protocol-relative
 * (`//evil.com`), absolute URLs, backslash tricks and control characters.
 * Returns the sanitised path or `null`.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 1024) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  // `/\evil.com` and `/\/evil.com` are treated as protocol-relative by some browsers.
  if (value.startsWith("/\\") || value.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.toLowerCase().startsWith("/login")) return null; // no redirect loop
  return value;
}

// --- login rate limiting -------------------------------------------------

/**
 * In-memory failure counters. NOTE: these live in the process only — they reset on
 * every restart and are per container. That is fine here: the gate is a single shared
 * password behind one small deployment, and the counters only need to blunt online
 * guessing, not stop a botnet.
 *
 * Two layers, on purpose:
 *
 *  1. Per client key: a hard block after {@link MAX_FAILURES} *failed* attempts.
 *     This can never lock anybody out of the app, because the login endpoint checks
 *     the password *before* it consults the limiter — a correct password is always
 *     accepted, no matter how many failures the key has accumulated.
 *  2. Global: a progressive delay only, never a block, so an attacker who rotates
 *     client keys is still slowed down while legitimate users keep working.
 */
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

/** Hard cap on tracked keys so header rotation cannot grow the map without bound. */
const MAX_TRACKED_KEYS = 10_000;

/** Global progressive delay: 50 ms per failure in the window, capped at 2 s. */
const GLOBAL_DELAY_STEP_MS = 50;
const GLOBAL_DELAY_MAX_MS = 2_000;

type Bucket = { count: number; resetAt: number };
const failures = new Map<string, Bucket>();

let globalFailures = 0;
let globalResetAt = 0;

function sweep(now: number): void {
  for (const [key, bucket] of failures) {
    if (bucket.resetAt <= now) failures.delete(key);
  }
  if (globalResetAt <= now) {
    globalFailures = 0;
    globalResetAt = 0;
  }
}

/** Evicts the oldest entries (Map iterates in insertion order) until we fit again. */
function enforceCapacity(): void {
  while (failures.size > MAX_TRACKED_KEYS) {
    const oldest = failures.keys().next();
    if (oldest.done) return;
    failures.delete(oldest.value);
  }
}

export type RateLimitState = { blocked: boolean; retryAfterSeconds: number };

export function rateLimitState(key: string, now: number = Date.now()): RateLimitState {
  sweep(now);
  const bucket = failures.get(key);
  if (!bucket || bucket.count < MAX_FAILURES) return { blocked: false, retryAfterSeconds: 0 };
  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/**
 * Records one *failed* attempt — successes must never call this — and returns the
 * resulting per-key state. Also feeds the global counter behind
 * {@link globalFailureDelayMs}.
 */
export function recordFailedLogin(key: string, now: number = Date.now()): RateLimitState {
  sweep(now);
  const bucket = failures.get(key);
  if (!bucket) {
    failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
    enforceCapacity();
  } else {
    bucket.count += 1;
  }
  if (globalResetAt <= now) globalResetAt = now + FAILURE_WINDOW_MS;
  globalFailures += 1;
  return rateLimitState(key, now);
}

/**
 * Artificial delay derived from *all* recent failures, regardless of client key.
 * Never blocks: a legitimate user pays at most {@link GLOBAL_DELAY_MAX_MS} once,
 * while an attacker spraying from many addresses pays it on every single guess.
 */
export function globalFailureDelayMs(now: number = Date.now()): number {
  sweep(now);
  return Math.min(GLOBAL_DELAY_MAX_MS, globalFailures * GLOBAL_DELAY_STEP_MS);
}

/** Called after a successful login — that key starts from zero again. */
export function clearFailedLogins(key: string): void {
  failures.delete(key);
}

/** Test helper — drops all counters. */
export function resetRateLimits(): void {
  failures.clear();
  globalFailures = 0;
  globalResetAt = 0;
}

/** Number of tracked keys — for tests and diagnostics only. */
export function trackedRateLimitKeys(): number {
  return failures.size;
}

/**
 * Client key for rate limiting, derived defensively.
 *
 * With `TRUST_PROXY=1` we take the *right-most* `x-forwarded-for` entry — the address
 * the trusted reverse proxy actually observed; left-most entries are client-supplied
 * and therefore forgeable. Without `TRUST_PROXY` no header is trusted at all and we
 * fall back to the connection's own address (when the runtime hands us one) or to a
 * single shared bucket.
 *
 * RESIDUAL RISK: neither source is fully trustworthy. Anyone who can reach the
 * container directly (bypassing the reverse proxy) chooses their own
 * `x-forwarded-for`, and a botnet chooses its own source addresses — per-key counters
 * can therefore always be evaded. That is deliberate and harmless here: the per-key
 * block only ever rejects *wrong* passwords (a correct one is accepted before the
 * limiter is consulted at all), and what actually bounds brute force is the
 * key-independent progressive delay from {@link globalFailureDelayMs}.
 */
export function clientKey(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
  remoteAddress?: string | null,
): string {
  const fallback =
    typeof remoteAddress === "string" && remoteAddress.trim().length > 0
      ? remoteAddress.trim().slice(0, 64)
      : "all";

  if (env.TRUST_PROXY !== "1") return fallback;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const ip = parts[parts.length - 1];
    if (ip) return ip.slice(0, 64);
  }
  const real = headers.get("x-real-ip");
  if (real && real.trim()) return real.trim().slice(0, 64);
  return fallback;
}
