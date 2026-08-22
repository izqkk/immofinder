import { distanceKmFromMeters } from "./score";
import { hasRealCoords, type MapsOrigin } from "./maps";
import type { RawListing, Settings } from "./types";

/** Great-circle distance between two coordinates in kilometres (haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True when a custom start location is configured (lat/lng ≠ 0). */
export function hasCustomStart(settings: Settings): boolean {
  return settings.startLat !== 0 && settings.startLng !== 0;
}

/**
 * Start location for Google Maps directions: explicit coordinates beat the start
 * address, and without either it is `null` (the UI then only links the destination).
 * Lives here instead of in `lib/maps.ts` because the Maps module ends up in the client
 * bundle, while the settings (better-sqlite3) may only be read on the server.
 */
export function originFromSettings(settings: Settings): MapsOrigin {
  if (hasCustomStart(settings)) return { lat: settings.startLat, lng: settings.startLng };
  const address = settings.startAddress?.trim();
  return address ? { address } : null;
}

/**
 * Smallest precomputed distance from Fredy's `distances` column (v24 and later), in
 * metres. Format: `[{"label":"Home","meters":30398.6}]` — several addresses are
 * possible, and for us the nearest one counts.
 */
function metersFromFredyDistances(distances: string | null | undefined): number | null {
  if (!distances) return null;
  try {
    const parsed: unknown = JSON.parse(distances);
    if (!Array.isArray(parsed)) return null;
    const meters = parsed
      .map((entry) => (entry as { meters?: unknown } | null)?.meters)
      .filter((m): m is number => typeof m === "number" && Number.isFinite(m));
    return meters.length > 0 ? Math.min(...meters) : null;
  } catch {
    return null;
  }
}

/**
 * Distance of a listing to the destination, in km.
 * - Custom start location set + listing has coordinates ⇒ haversine (live).
 * - Otherwise fall back to Fredy's precomputed distance: `distances` (v24 and later),
 *   failing that `distance_to_destination` (older instances).
 */
export function resolveDistanceKm(listing: RawListing, settings: Settings): number | null {
  // `hasRealCoords` filters out Fredy's -1/-1 sentinel — otherwise listings that have
  // not been geocoded yet would yield a beeline to the Atlantic (roughly 5600 km).
  const { latitude, longitude } = listing;
  if (hasCustomStart(settings) && hasRealCoords(latitude, longitude)) {
    return haversineKm(settings.startLat, settings.startLng, latitude!, longitude!);
  }
  return distanceKmFromMeters(
    metersFromFredyDistances(listing.distances) ?? listing.distance_to_destination,
  );
}
