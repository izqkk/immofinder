import { ListingsView } from "./listings-view";
import { getAvailableProviders, parseListingQuery, queryListings } from "@/lib/listings";
import { getSettings } from "@/lib/settings";
import { originFromSettings } from "@/lib/geo";
import { LISTING_TABS, isListingTab, type ListingTab } from "@/lib/back-link";
import type { EnrichedListing } from "@/lib/types";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Splits the (already filtered) result set into the four tab buckets — same
 *  semantics as before: "all" = live and not discarded. Deleted listings are only
 *  included when the filter bar asked for them. */
function partition(full: EnrichedListing[]): Record<ListingTab, EnrichedListing[]> {
  const buckets: Record<ListingTab, EnrichedListing[]> = {
    shortlist: [],
    maybe: [],
    all: [],
    discarded: [],
  };
  for (const l of full) {
    if (l.status === "discarded") {
      buckets.discarded.push(l);
      continue;
    }
    if (l.status === "shortlist") buckets.shortlist.push(l);
    if (l.status === "maybe") buckets.maybe.push(l);
    buckets.all.push(l);
  }
  return buckets;
}

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  await requirePageSession();
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const active: ListingTab = isListingTab(tabParam) ? tabParam : LISTING_TABS[0];

  // Apply the filter bar's filters; status is irrelevant here (the tabs handle it),
  // discarded listings always come along, deleted ones only on request ("show deleted").
  const settings = getSettings();
  const query = parseListingQuery(sp);
  const full = queryListings({
    ...query,
    status: "any",
    includeDeleted: query.includeDeleted ?? false,
    includeDiscarded: true,
  });
  const buckets = partition(full);
  const providers = getAvailableProviders();

  return (
    <ListingsView
      buckets={buckets}
      initialTab={active}
      providers={providers}
      defaultSort={settings.defaultSort}
      mapsOrigin={originFromSettings(settings)}
    />
  );
}
