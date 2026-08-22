/**
 * The background status bar. Three kinds of run report progress here — the portal
 * scrape, the availability re-check and the geocode back-fill — plus the short notice
 * each of them leaves behind when it finishes.
 */
export const status = {
  scrape: {
    starting: "Starting search …",
    running: {
      one: "Search running … ({count} job)",
      other: "Search running … ({count} jobs)",
    },
  },
  availability: {
    running: "Checking availability …",
    progress: "Checking availability … {done}/{total}",
  },
  geocode: {
    running: "Looking up addresses …",
    progress: "Looking up addresses … {done}/{total}",
  },
  done: {
    scrape: {
      none: "Search finished — no new listings",
      found: {
        one: "{count} new listing found",
        other: "{count} new listings found",
      },
    },
    availability: {
      none: "Availability checked — every listing is still reachable",
      gone: {
        one: "Availability checked — {count} listing is gone",
        other: "Availability checked — {count} listings are gone",
      },
    },
    geocode: {
      none: "Addresses looked up — no new coordinates",
      resolved: {
        one: "Addresses looked up — {count} listing located",
        other: "Addresses looked up — {count} listings located",
      },
    },
  },
};
