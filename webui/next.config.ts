import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Don't advertise the framework/version to anyone scanning the public host.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pictures.immobilienscout24.de" },
      { protocol: "https", hostname: "img.kleinanzeigen.de" },
      { protocol: "https", hostname: "cmcdn.de" },
      { protocol: "https", hostname: "**.immowelt.org" },
      { protocol: "https", hostname: "**.immowelt.de" },
    ],
  },
  // Security headers for every response. Deliberately no CSP: Next's inline
  // bootstrap scripts would need a nonce pipeline, and an unverified CSP is worse
  // than none. Framing is blocked via X-Frame-Options + frame-ancestors.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Two years, subdomains included. Harmless on an instance served over plain
          // http — browsers ignore HSTS there — and correct as soon as TLS is added.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Private deployment: nothing here belongs in a search index.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
      {
        // Everything except the immutable build assets is session-dependent.
        // The proxy sets `Vary: Cookie` too, but Next's renderer overwrites `Vary`
        // with its own RSC value on rendered pages — there the guarantee rests on
        // `Cache-Control: private, no-store` (also set by the proxy), which forbids
        // any shared cache from storing the response in the first place.
        source: "/((?!_next/static).*)",
        headers: [{ key: "Vary", value: "Cookie" }],
      },
    ];
  },
};

export default nextConfig;
