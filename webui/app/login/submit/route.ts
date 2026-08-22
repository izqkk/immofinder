/**
 * Login endpoint for the form on `/login`.
 *
 * A route handler (not a server action) on purpose: it can answer with real HTTP
 * status codes — 429 when a client keeps guessing wrong, 303 on success — and it
 * works with plain HTML forms, i.e. entirely without JavaScript.
 *
 * ORDER MATTERS: the password is verified FIRST, before any rate-limit state is
 * consulted. A correct password is therefore always accepted — nobody can lock
 * legitimate users out by burning failed attempts on a shared/forged client key.
 * Only failures are counted, and a success resets that key's counter.
 *
 * The password is compared in constant time, never logged, and never leaves the
 * server; only the signed session cookie goes back to the client.
 *
 * The cookie's flavour follows the transport of *this* request (see
 * `isSecureRequest`): https gets `__Host-immofinder_session` + `Secure`, plain http
 * gets `immofinder_session` without `Secure` — otherwise the browser would never
 * send the cookie back and login would appear to succeed and then bounce.
 * `REQUIRE_HTTPS=1` turns the plaintext case into a hard refusal instead.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  clearFailedLogins,
  clientKey,
  createSessionToken,
  currentPasswordFingerprint,
  getAuthSecret,
  globalFailureDelayMs,
  isAuthConfigured,
  isSecureRequest,
  recordFailedLogin,
  requiresHttps,
  safeNextPath,
  sessionCookieName,
  SESSION_COOKIE_NAMES,
  verifyPassword,
} from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { clearCookieOptions, sessionCookieOptions } from "@/lib/session";

/** Base cost of a wrong password; the global counter adds up to 2 s on top. */
const FAILURE_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seeOther(location: string): NextResponse {
  // Relative Location keeps the public host intact behind the reverse proxy.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Plain-text error bodies still follow the visitor's language cookie — this handler
  // answers form posts directly, so its text is all the user gets to see.
  const t = await getT();

  if (!isAuthConfigured()) {
    return new NextResponse(t("login.errors.notConfigured"), {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  // Transport decides the cookie flavour — per request, not per NODE_ENV.
  // Note that Next derives the URL scheme from `x-forwarded-proto` too, which is why
  // `isSecureRequest` looks at that header first and only trusts it with TRUST_PROXY=1.
  const secure = isSecureRequest(request.url, request.headers);

  // Opt-in hard requirement for the https deployment: never issue a session over a
  // plaintext connection, so a misconfigured proxy cannot downgrade the gate.
  if (!secure && requiresHttps()) {
    return new NextResponse(t("login.errors.httpsRequired"), {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  // Cheap CSRF guard: a cross-site form post carries a foreign Origin.
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!originHost || !host || originHost !== host) {
      return new NextResponse(null, { status: 403 });
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return seeOther("/login?error=1");
  }

  const password = form.get("password");
  const next = safeNextPath(form.get("next")) ?? "/";
  const key = clientKey(request.headers);

  // 1. Password first — a correct one is accepted regardless of limiter state.
  if (verifyPassword(typeof password === "string" ? password : null)) {
    clearFailedLogins(key);
    const response = seeOther(next);
    const name = sessionCookieName(secure);
    response.cookies.set(
      name,
      createSessionToken(getAuthSecret(), currentPasswordFingerprint()),
      sessionCookieOptions(secure),
    );
    // Drop a stale cookie under the other name (e.g. after switching to https).
    for (const other of SESSION_COOKIE_NAMES) {
      if (other !== name) response.cookies.set(other, "", clearCookieOptions(other));
    }
    return response;
  }

  // 2. Only failures are counted and slowed down.
  const state = recordFailedLogin(key);
  await sleep(FAILURE_DELAY_MS + globalFailureDelayMs());

  if (state.blocked) {
    return new NextResponse(t("login.errors.rateLimited"), {
      status: 429,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": String(state.retryAfterSeconds),
        "Cache-Control": "private, no-store",
      },
    });
  }
  return seeOther(`/login?error=1&next=${encodeURIComponent(next)}`);
}
