// The single source of truth for the portals' display names. The keys are exactly the
// values stored in the database (including the camelCase in `wgGesucht`) — which is why
// nothing is normalised here on purpose.

export const PROVIDER_LABELS: Record<string, string> = {
  immoscout: "IS24",
  immowelt: "Immowelt",
  kleinanzeigen: "Kleinanzeigen",
  wgGesucht: "WG-Gesucht",
};

/** Display name of a portal; unknown ids are passed through unchanged. */
export function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] ?? id;
}
