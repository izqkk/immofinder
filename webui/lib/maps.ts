// Deliberately free of runtime imports: this module ends up in the client bundle via
// the swipe card. The start location from the settings is supplied on the server by
// `originFromSettings` (lib/geo.ts).

/** Your own start location (home/work) — the destination of the route. */
export type MapsOrigin = { lat: number; lng: number } | { address: string } | null;

/** Only the fields that matter for the Maps link (listing types are irrelevant here). */
type MapsDestination = {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Real coordinates? Fredy writes `-1/-1` for "not geocoded" (about one sixth of all
 * listings) — which would otherwise turn into a destination in the middle of the
 * Atlantic. `0/0` (Null Island) and values outside the valid range likewise count as
 * "no coordinates"; the address takes over in that case.
 */
export function hasRealCoords(lat: number | null, lng: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat === -1 && lng === -1) return false;
  return true;
}

/** The configured start location as the route's destination. */
function homeParam(origin: MapsOrigin): string | null {
  if (!origin) return null;
  if ("lat" in origin) return `${origin.lat},${origin.lng}`;
  const address = origin.address.trim();
  return address ? address : null;
}

/**
 * Google Maps link for a listing.
 * - With a start location: directions in public-transport mode (`travelmode=transit`),
 *   and specifically **from the property to the start location** — the commute is what
 *   matters, and for that direction Maps shows the departures from the flat.
 * - Without a start location: a plain place search for the property.
 * - Neither coordinates nor address ⇒ `null` (no link is rendered then).
 */
export function buildMapsHref(listing: MapsDestination, origin: MapsOrigin): string | null {
  const from = hasRealCoords(listing.latitude, listing.longitude)
    ? `${listing.latitude},${listing.longitude}`
    : (listing.address?.trim() ?? "");
  if (!from) return null;

  const home = homeParam(origin);
  if (home) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      from,
    )}&destination=${encodeURIComponent(home)}&travelmode=transit`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(from)}`;
}
