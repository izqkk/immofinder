/**
 * User-Agent sent to Nominatim.
 *
 * OpenStreetMap's usage policy requires a User-Agent that identifies the application
 * and offers a way to get in touch. Self-hosters should set `GEOCODER_USER_AGENT` to
 * something with their own contact address — the default identifies the software but
 * says nothing about who is running this particular instance.
 *
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const FALLBACK_USER_AGENT = "ImmoFinder (self-hosted; https://github.com/izqkk/immofinder)";

// `||` rather than `??` on purpose: Compose always defines the variable, so an
// unset value arrives as an empty string — which `??` would happily keep, leaving
// Nominatim with no User-Agent at all.
export const GEOCODER_USER_AGENT =
  process.env.GEOCODER_USER_AGENT?.trim() || FALLBACK_USER_AGENT;
