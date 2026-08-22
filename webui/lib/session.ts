/**
 * Session plumbing on top of `lib/auth.ts` — reads/writes the signed session
 * cookie and provides the guards used by pages, layouts and server actions.
 *
 * Defence in depth: the proxy (`proxy.ts`) blocks unauthenticated requests at the
 * edge of the app, but every page and every server action calls a guard from here
 * as well. If the proxy were bypassed or its matcher regressed, nothing works.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  currentPasswordFingerprint,
  getAuthSecret,
  isSecureRequest,
  SESSION_COOKIE_NAMES,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readSessionCookie,
  sessionCookieName,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth";

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

/**
 * Cookie attributes for a request we already classified as (non-)secure. `secure`
 * comes from {@link isSecureRequest}, never from `NODE_ENV`: over plain http a
 * `Secure` cookie is simply never sent back, which would lock everyone out.
 */
export function sessionCookieOptions(secure: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    // `__Host-` requires exactly this: Path=/ and no Domain attribute.
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Attributes for deleting a cookie. The `__Host-` variant must be expired *with*
 * `Secure`, otherwise the browser rejects the deletion; the plain name never needs it.
 */
export function clearCookieOptions(name: string): SessionCookieOptions {
  return { ...sessionCookieOptions(name === SESSION_COOKIE_SECURE), maxAge: 0 };
}

/**
 * Secure-ness of the current request in a server-action / RSC context, where only
 * the headers are available (no request URL) — so the forwarded scheme decides, and
 * only when `TRUST_PROXY=1`. Route handlers have the URL and should call
 * {@link isSecureRequest} with it directly.
 */
export async function requestIsSecure(): Promise<boolean> {
  return isSecureRequest(null, await headers());
}

/** Current session or `null` — never throws, not even on broken configuration. */
export async function getSession(): Promise<SessionPayload | null> {
  let secret: string;
  let fingerprint: string;
  try {
    secret = getAuthSecret();
    fingerprint = currentPasswordFingerprint();
  } catch {
    // missing/short AUTH_SECRET or APP_PASSWORD → nobody is authenticated
    return null;
  }
  const store = await cookies();
  const token = readSessionCookie((name) => store.get(name)?.value);
  return verifySessionToken(token, secret, fingerprint);
}

/** Guard for server actions — throws (surfacing as a 500 to the client) when unauthenticated. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/** Guard for pages and layouts — sends the browser to the login form. */
export async function requirePageSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Issues a fresh session cookie (server action / route handler context). `secure`
 * defaults to what {@link requestIsSecure} says about the current request.
 */
export async function startSession(secure?: boolean): Promise<void> {
  const isSecure = secure ?? (await requestIsSecure());
  const token = createSessionToken(getAuthSecret(), currentPasswordFingerprint());
  const store = await cookies();
  const name = sessionCookieName(isSecure);
  store.set(name, token, sessionCookieOptions(isSecure));
  // Drop a stale cookie under the other name (e.g. after switching to https).
  for (const other of SESSION_COOKIE_NAMES) {
    if (other !== name) store.set(other, "", clearCookieOptions(other));
  }
}

/** Clears the session cookie — both possible names. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    store.set(name, "", clearCookieOptions(name));
  }
}
