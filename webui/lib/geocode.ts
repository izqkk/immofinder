// Server-side geocoding via OpenStreetMap/Nominatim. Called ONLY when settings are
// saved (never per request) — the result is persisted as startLat/startLng.
//
// Nominatim requires a meaningful User-Agent; see lib/geocoder-agent.ts.

import { GEOCODER_USER_AGENT } from "./geocoder-agent";

export type GeocodeResult = { lat: number; lng: number; displayName: string };

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": GEOCODER_USER_AGENT,
        // The portals are German, so German place names resolve most reliably —
        // independent of which language the UI is rendered in.
        "Accept-Language": "de",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const { lat, lon, display_name } = data[0];
    const latN = Number(lat);
    const lngN = Number(lon);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
    return { lat: latN, lng: lngN, displayName: display_name };
  } catch {
    return null;
  }
}
