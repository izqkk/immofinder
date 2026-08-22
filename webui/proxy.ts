/**
 * Request gate — Next.js 16 calls this "Proxy"; it is the former `middleware.ts`
 * (see node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:625).
 * The file must be named `proxy.ts` on Next 16; `middleware.ts` is deprecated.
 *
 * Everything is closed by default: only the login form, its POST endpoint, the app
 * icon and Next's build assets under `/_next/static/` are reachable without a valid
 * session cookie. The allowlist below is exhaustive — new routes are protected
 * automatically. Notably `/_next/image` is NOT public: it would work as an open
 * image proxy for the configured remote patterns and burn CPU for anonymous
 * callers, and the login page needs no images.
 *
 * This is only the first line of defence; pages/layouts and every server action
 * additionally verify the session themselves (see `lib/session.ts`).
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  currentPasswordFingerprint,
  getAuthSecret,
  isAuthConfigured,
  readSessionCookie,
  safeNextPath,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/login/submit", "/icon.svg"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/static/")) return true;
  return false;
}

/**
 * Everything behind the gate is per-user and must never be stored or reused by a
 * shared cache (reverse proxy, CDN). Applied to the pass-through as well as to the
 * redirect/401/503 answers, so no intermediary can ever hand authenticated HTML —
 * or a cached redirect — to a different visitor.
 *
 * `Cache-Control` survives into the final response; `Vary` does not on rendered
 * pages, because Next's renderer replaces it with its own RSC value (that is why
 * `next.config.ts` declares `Vary: Cookie` as well). `no-store` is the load-bearing
 * part: a shared cache must not store the response at all.
 */
function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

function unauthorized(): NextResponse {
  // No body, no hint about what exists behind the gate.
  return noStore(new NextResponse(null, { status: 401 }));
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // Misconfigured deployment (APP_PASSWORD missing or too short / no usable
  // AUTH_SECRET): refuse everything rather than fall open — including the login form.
  if (!isAuthConfigured()) {
    // Deliberately NOT translated: this fires exactly when the app is unconfigured, so
    // no locale has been negotiated and no dictionary is worth loading. The reader is
    // whoever deployed the container, not an end user — English, naming the variables.
    return noStore(
      new NextResponse(
        "Server is not configured: set APP_PASSWORD (at least 12 characters) and " +
          "AUTH_SECRET (at least 32 characters).",
        {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        },
      ),
    );
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = readSessionCookie((name) => request.cookies.get(name)?.value);
  if (verifySessionToken(token, getAuthSecret(), currentPasswordFingerprint())) {
    return noStore(NextResponse.next());
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return unauthorized();

  // Server actions and RSC payload requests are POSTs/fetches, not navigations —
  // only real document navigations get the redirect, everything else gets 401.
  const target = safeNextPath(`${pathname}${search}`);
  const location = target ? `/login?next=${encodeURIComponent(target)}` : "/login";
  // Next requires an absolute redirect target here; `nextUrl` already carries the
  // public host/protocol as seen through the reverse proxy.
  return noStore(NextResponse.redirect(new URL(location, request.nextUrl), 307));
}

export const config = {
  // Run on every request; the allowlist above decides, not the matcher.
  matcher: "/:path*",
};
