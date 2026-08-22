import { createHmac } from "node:crypto";
import { beforeEach, expect, test } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE_SECONDS,
  clearFailedLogins,
  clientKey,
  constantTimeEquals,
  createSessionToken,
  currentPasswordFingerprint,
  getAppPassword,
  globalFailureDelayMs,
  isAuthConfigured,
  isSecureRequest,
  passwordFingerprint,
  rateLimitState,
  readSessionCookie,
  recordFailedLogin,
  requiresHttps,
  resetRateLimits,
  safeNextPath,
  sessionCookieName,
  trackedRateLimitKeys,
  verifyPassword,
  verifySessionToken,
} from "./auth";

/**
 * Build a minimal `ProcessEnv` for a test.
 *
 * Recent `@types/node` versions declare `NODE_ENV` as required on `ProcessEnv`, which
 * an object literal with two variables in it obviously does not have. None of these
 * tests read it — the auth layer deliberately never branches on `NODE_ENV` — so the
 * cast is confined to this one helper instead of being repeated at every call site.
 */
function testEnv(vars: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return vars as unknown as NodeJS.ProcessEnv;
}


const SECRET = "0123456789abcdef0123456789abcdef";
const OTHER_SECRET = "fedcba9876543210fedcba9876543210";
const FP = passwordFingerprint("correct-horse-battery");
const OTHER_FP = passwordFingerprint("something-else-entirely");

beforeEach(() => {
  resetRateLimits();
});

// --- token ---------------------------------------------------------------

test("valid token round-trips", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(SECRET, FP, now);
  const payload = verifySessionToken(token, SECRET, FP, now + 1000);
  expect(payload).toEqual({
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
    fingerprint: FP,
  });
});

test("token carries neither password nor secret", () => {
  const token = createSessionToken(SECRET, FP, 1_700_000_000_000);
  expect(token).not.toContain(SECRET);
  expect(token).not.toContain("correct-horse-battery");
  const decoded = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
  expect(decoded).toMatch(/^\d+\|\d+\|[0-9a-f]{16}$/);
});

test("tampered payload is rejected", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(SECRET, FP, now);
  const [, signature] = token.split(".");
  const forgedPayload = Buffer.from(
    `${now}|${now + 10 * 365 * 24 * 3600 * 1000}|${FP}`,
    "utf8",
  ).toString("base64url");
  expect(verifySessionToken(`${forgedPayload}.${signature}`, SECRET, FP, now)).toBeNull();
});

test("tampered signature is rejected", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(SECRET, FP, now);
  const [payload, signature] = token.split(".");
  const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
  expect(verifySessionToken(`${payload}.${flipped}`, SECRET, FP, now)).toBeNull();
});

test("token signed with a different secret is rejected", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(OTHER_SECRET, FP, now);
  expect(verifySessionToken(token, SECRET, FP, now)).toBeNull();
});

test("expired token is rejected", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(SECRET, FP, now);
  expect(verifySessionToken(token, SECRET, FP, now + SESSION_MAX_AGE_SECONDS * 1000)).toBeNull();
  expect(
    verifySessionToken(token, SECRET, FP, now + SESSION_MAX_AGE_SECONDS * 1000 + 1),
  ).toBeNull();
});

test("malformed input is rejected", () => {
  const cases: unknown[] = [
    undefined,
    null,
    42,
    {},
    "",
    ".",
    "abc",
    "abc.",
    ".abc",
    "a.b.c",
    "!!!.!!!",
    "x".repeat(600),
    Buffer.from("not-a-payload", "utf8").toString("base64url") + ".sig",
  ];
  for (const value of cases) {
    expect(verifySessionToken(value, SECRET, FP)).toBeNull();
  }
});

test("payload without a valid expiry is rejected even when correctly signed", () => {
  // Correctly signed but semantically broken payloads must not pass.
  const forge = (payload: string) =>
    `${Buffer.from(payload, "utf8").toString("base64url")}.${createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url")}`;
  expect(verifySessionToken(forge(`abc|def|${FP}`), SECRET, FP)).toBeNull();
  expect(verifySessionToken(forge(`1|2|3|${FP}`), SECRET, FP)).toBeNull();
  expect(verifySessionToken(forge(`2000|1000|${FP}`), SECRET, FP)).toBeNull();
  // Old two-field payload (pre-fingerprint format) must not pass either.
  expect(verifySessionToken(forge("1700000000000|9999999999999"), SECRET, FP)).toBeNull();
});

// --- password binding ----------------------------------------------------

test("changing the password invalidates existing tokens", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(SECRET, FP, now);
  expect(verifySessionToken(token, SECRET, FP, now + 1000)).not.toBeNull();
  expect(verifySessionToken(token, SECRET, OTHER_FP, now + 1000)).toBeNull();
});

test("fingerprint is derived from the configured password", () => {
  const env = testEnv({ APP_PASSWORD: "correct-horse-battery" });
  expect(currentPasswordFingerprint(env)).toBe(FP);
  expect(passwordFingerprint("correct-horse-battery")).toMatch(/^[0-9a-f]{16}$/);
  expect(passwordFingerprint("a-different-password")).not.toBe(FP);
});

test("token creation refuses a bogus fingerprint", () => {
  expect(() => createSessionToken(SECRET, "", 1)).toThrow();
  expect(() => createSessionToken(SECRET, "NOTHEX0123456789", 1)).toThrow();
});

// --- secret length -------------------------------------------------------

test("signing refuses a missing or too-short secret", () => {
  expect(() => createSessionToken("", FP, 1)).toThrow();
  expect(() => createSessionToken("short", FP, 1)).toThrow();
  expect(() => createSessionToken("x".repeat(31), FP, 1)).toThrow();
  expect(() => createSessionToken("x".repeat(32), FP, 1)).not.toThrow();
});

test("verification rejects (never accepts) with a too-short secret", () => {
  const now = 1_700_000_000_000;
  const token = createSessionToken(SECRET, FP, now);
  expect(verifySessionToken(token, "", FP, now)).toBeNull();
  expect(verifySessionToken(token, "short", FP, now)).toBeNull();
  // An empty-secret forgery must not be accepted either.
  const payload = `${now}|${now + 1000}|${FP}`;
  const forged = `${Buffer.from(payload, "utf8").toString("base64url")}.${createHmac("sha256", "")
    .update(payload)
    .digest("base64url")}`;
  expect(verifySessionToken(forged, "", FP, now)).toBeNull();
});

// --- password ------------------------------------------------------------

test("password comparison is exact and length-tolerant", () => {
  const env = testEnv({ APP_PASSWORD: "correct-horse-battery" });
  expect(verifyPassword("correct-horse-battery", env)).toBe(true);
  expect(verifyPassword("correct-horse-batter", env)).toBe(false);
  expect(verifyPassword("", env)).toBe(false);
  expect(verifyPassword(null, env)).toBe(false);
  expect(verifyPassword("x".repeat(5000), env)).toBe(false);
});

test("missing APP_PASSWORD refuses instead of falling open", () => {
  expect(() => verifyPassword("anything", testEnv({}))).toThrow();
});

test("a password shorter than the minimum counts as unconfigured", () => {
  const short = "x".repeat(MIN_PASSWORD_LENGTH - 1);
  const long = "x".repeat(MIN_PASSWORD_LENGTH);
  expect(() => getAppPassword(testEnv({ APP_PASSWORD: short }))).toThrow();
  expect(getAppPassword(testEnv({ APP_PASSWORD: long }))).toBe(long);
  // even the correct short password must not be accepted
  expect(() => verifyPassword(short, testEnv({ APP_PASSWORD: short }))).toThrow();
  expect(isAuthConfigured(testEnv({ APP_PASSWORD: short, AUTH_SECRET: SECRET }))).toBe(
    false,
  );
  expect(isAuthConfigured(testEnv({ APP_PASSWORD: long, AUTH_SECRET: SECRET }))).toBe(
    true,
  );
  expect(
    isAuthConfigured(testEnv({ APP_PASSWORD: long, AUTH_SECRET: "too-short" })),
  ).toBe(false);
});

test("constant-time comparison still compares correctly", () => {
  expect(constantTimeEquals("abc", "abc")).toBe(true);
  expect(constantTimeEquals("abc", "abd")).toBe(false);
  expect(constantTimeEquals("abc", "abcdef")).toBe(false);
});

// --- cookie names --------------------------------------------------------

test("secure deployments use the __Host- prefixed cookie", () => {
  expect(sessionCookieName(true)).toBe(SESSION_COOKIE_SECURE);
  expect(SESSION_COOKIE_SECURE.startsWith("__Host-")).toBe(true);
  expect(sessionCookieName(false)).toBe(SESSION_COOKIE);
});

test("readers accept whichever cookie name is present", () => {
  const from = (jar: Record<string, string>) => readSessionCookie((name) => jar[name]);
  expect(from({ [SESSION_COOKIE]: "plain" })).toBe("plain");
  expect(from({ [SESSION_COOKIE_SECURE]: "host" })).toBe("host");
  // both present → the __Host- one wins
  expect(from({ [SESSION_COOKIE]: "plain", [SESSION_COOKIE_SECURE]: "host" })).toBe("host");
  expect(from({})).toBeUndefined();
  expect(from({ [SESSION_COOKIE]: "" })).toBeUndefined();
});

// --- transport / secure detection ----------------------------------------

const TRUSTED = testEnv({ TRUST_PROXY: "1" });
const UNTRUSTED = testEnv({});

test("https URLs are secure when no forwarded scheme is in play", () => {
  expect(isSecureRequest("https://immo.example/login", new Headers(), UNTRUSTED)).toBe(true);
  expect(isSecureRequest(new URL("https://immo.example/"), new Headers(), TRUSTED)).toBe(true);
  expect(
    isSecureRequest("https://immo.example/", new Headers({ "x-forwarded-proto": "https" }), TRUSTED),
  ).toBe(true);
});

test("an untrusted forwarded scheme is never believed, not even through the URL", () => {
  // Next folds `x-forwarded-proto` into `request.url`, so a forged header would
  // otherwise arrive as an https URL. Header present + no TRUST_PROXY → plaintext.
  const forged = new Headers({ "x-forwarded-proto": "https" });
  expect(isSecureRequest("https://192.0.2.10:3000/login", forged, UNTRUSTED)).toBe(false);
  expect(isSecureRequest("https://192.0.2.10:3000/login", forged, TRUSTED)).toBe(true);
});

test("plain http without a trusted proxy is not secure", () => {
  const plain = new Headers();
  expect(isSecureRequest("http://192.0.2.10:3000/login", plain, UNTRUSTED)).toBe(false);
  expect(isSecureRequest("http://192.0.2.10:3000/login", plain, TRUSTED)).toBe(false);
});

test("x-forwarded-proto only counts with TRUST_PROXY=1", () => {
  const forwarded = new Headers({ "x-forwarded-proto": "https" });
  expect(isSecureRequest("http://internal:3000/login", forwarded, UNTRUSTED)).toBe(false);
  expect(isSecureRequest("http://internal:3000/login", forwarded, TRUSTED)).toBe(true);
  // proxy chains append; the left-most entry is the original scheme
  expect(
    isSecureRequest("http://internal:3000/", new Headers({ "x-forwarded-proto": "https, http" }), TRUSTED),
  ).toBe(true);
  expect(
    isSecureRequest("http://internal:3000/", new Headers({ "x-forwarded-proto": "http, https" }), TRUSTED),
  ).toBe(false);
  expect(
    isSecureRequest("http://internal:3000/", new Headers({ "x-forwarded-proto": "HTTPS" }), TRUSTED),
  ).toBe(true);
});

test("a missing or unparsable URL falls back to the forwarded scheme", () => {
  const forwarded = new Headers({ "x-forwarded-proto": "https" });
  expect(isSecureRequest(null, forwarded, TRUSTED)).toBe(true);
  expect(isSecureRequest(null, forwarded, UNTRUSTED)).toBe(false);
  expect(isSecureRequest("not a url", forwarded, TRUSTED)).toBe(true);
  expect(isSecureRequest("not a url", new Headers(), TRUSTED)).toBe(false);
  expect(isSecureRequest(undefined, new Headers(), TRUSTED)).toBe(false);
});

test("the cookie name follows the transport of the request", () => {
  const pick = (url: string, headers: Headers, env: NodeJS.ProcessEnv) =>
    sessionCookieName(isSecureRequest(url, headers, env));
  // plain http on a private address → plain name, no Secure attribute
  expect(pick("http://192.0.2.10:3000/login", new Headers(), TRUSTED)).toBe(SESSION_COOKIE);
  // behind a trusted TLS-terminating proxy → __Host- name
  expect(
    pick("http://internal:3000/login", new Headers({ "x-forwarded-proto": "https" }), TRUSTED),
  ).toBe(SESSION_COOKIE_SECURE);
  // direct https → __Host- name
  expect(pick("https://immo.example/login", new Headers(), UNTRUSTED)).toBe(SESSION_COOKIE_SECURE);
  // spoofed header without TRUST_PROXY → stays plain, so the gate keeps working
  expect(
    pick("http://192.0.2.10:3000/login", new Headers({ "x-forwarded-proto": "https" }), UNTRUSTED),
  ).toBe(SESSION_COOKIE);
});

test("REQUIRE_HTTPS is opt-in", () => {
  expect(requiresHttps(testEnv({}))).toBe(false);
  expect(requiresHttps(testEnv({ REQUIRE_HTTPS: "0" }))).toBe(false);
  expect(requiresHttps(testEnv({ REQUIRE_HTTPS: "true" }))).toBe(false);
  expect(requiresHttps(testEnv({ REQUIRE_HTTPS: "1" }))).toBe(true);
});

// --- redirect target -----------------------------------------------------

test("safeNextPath accepts same-origin paths", () => {
  expect(safeNextPath("/listings?tab=all")).toBe("/listings?tab=all");
  expect(safeNextPath("/")).toBe("/");
  expect(safeNextPath("/listings/abc?from=maybe#top")).toBe("/listings/abc?from=maybe#top");
});

test("safeNextPath rejects open-redirect attempts", () => {
  const bad = [
    "//evil.com",
    "///evil.com",
    "https://evil.com",
    "http://evil.com",
    "\\evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "evil.com",
    "javascript:alert(1)",
    "",
    "/path\nX",
    undefined,
    null,
    123,
    "/" + "a".repeat(2000),
  ];
  for (const value of bad) expect(safeNextPath(value)).toBeNull();
});

test("safeNextPath refuses to point back at the login page", () => {
  expect(safeNextPath("/login")).toBeNull();
  expect(safeNextPath("/login/submit")).toBeNull();
});

// --- rate limiting -------------------------------------------------------

test("rate limit blocks a key after 8 failures and expires after the window", () => {
  const now = 1_700_000_000_000;
  for (let i = 0; i < 7; i++) recordFailedLogin("1.2.3.4", now);
  expect(rateLimitState("1.2.3.4", now).blocked).toBe(false);
  recordFailedLogin("1.2.3.4", now);
  const state = rateLimitState("1.2.3.4", now);
  expect(state.blocked).toBe(true);
  expect(state.retryAfterSeconds).toBeGreaterThan(0);
  // other clients stay unaffected
  expect(rateLimitState("5.6.7.8", now).blocked).toBe(false);
  // window expires
  expect(rateLimitState("1.2.3.4", now + 15 * 60 * 1000 + 1).blocked).toBe(false);
});

test("a success clears that key's failures", () => {
  const now = 1_700_000_000_000;
  for (let i = 0; i < 8; i++) recordFailedLogin("1.2.3.4", now);
  expect(rateLimitState("1.2.3.4", now).blocked).toBe(true);
  clearFailedLogins("1.2.3.4");
  expect(rateLimitState("1.2.3.4", now).blocked).toBe(false);
});

test("failures never block globally — only delay", () => {
  const now = 1_700_000_000_000;
  // A flood from many keys (and from the shared fallback bucket) must not block
  // a different client: that would be an unauthenticated lockout DoS.
  for (let i = 0; i < 500; i++) recordFailedLogin(`attacker-${i}`, now);
  for (let i = 0; i < 50; i++) recordFailedLogin("all", now);
  expect(rateLimitState("victim", now).blocked).toBe(false);
  // ...but everybody pays a delay, capped at 2 s.
  expect(globalFailureDelayMs(now)).toBe(2000);
});

test("global delay grows progressively and expires with the window", () => {
  const now = 1_700_000_000_000;
  expect(globalFailureDelayMs(now)).toBe(0);
  recordFailedLogin("a", now);
  expect(globalFailureDelayMs(now)).toBe(50);
  recordFailedLogin("b", now);
  expect(globalFailureDelayMs(now)).toBe(100);
  expect(globalFailureDelayMs(now + 15 * 60 * 1000 + 1)).toBe(0);
});

test("the failure map is capped so header rotation cannot grow it forever", () => {
  const now = 1_700_000_000_000;
  for (let i = 0; i < 10_050; i++) recordFailedLogin(`key-${i}`, now);
  expect(trackedRateLimitKeys()).toBe(10_000);
  // oldest entries were evicted, newest are still tracked
  expect(rateLimitState("key-0", now).blocked).toBe(false);
  for (let i = 0; i < 8; i++) recordFailedLogin("key-10049", now);
  expect(rateLimitState("key-10049", now).blocked).toBe(true);
});

test("client key only trusts x-forwarded-for when TRUST_PROXY=1", () => {
  const headers = new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.5" });
  // spoofed header without TRUST_PROXY → ignored, falls back to the connection
  expect(clientKey(headers, testEnv({}))).toBe("all");
  expect(clientKey(headers, testEnv({}), "203.0.113.7")).toBe("203.0.113.7");
  // with TRUST_PROXY only the right-most (proxy-appended) entry counts
  expect(clientKey(headers, testEnv({ TRUST_PROXY: "1" }))).toBe("10.0.0.5");
  expect(clientKey(headers, testEnv({ TRUST_PROXY: "1" }), "203.0.113.7")).toBe(
    "10.0.0.5",
  );
});

test("client key ignores x-real-ip unless the proxy is trusted", () => {
  const headers = new Headers({ "x-real-ip": "9.9.9.9" });
  expect(clientKey(headers, testEnv({}), "203.0.113.7")).toBe("203.0.113.7");
  expect(clientKey(headers, testEnv({ TRUST_PROXY: "1" }))).toBe("9.9.9.9");
});

test("client key is length-capped", () => {
  const headers = new Headers({ "x-forwarded-for": "z".repeat(500) });
  expect(clientKey(headers, testEnv({ TRUST_PROXY: "1" })).length).toBe(64);
  expect(clientKey(new Headers(), testEnv({}), "y".repeat(500)).length).toBe(64);
});
