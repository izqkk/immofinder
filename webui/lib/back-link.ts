/** Origin-aware navigation between the listing lists and a listing detail page.
 *  Cards link to `/listings/<id>?from=<tab>` (or `?from=search&<filters>`), the
 *  detail page turns that back into a "Back to …" link. */

export const LISTING_TABS = ["shortlist", "maybe", "all", "discarded"] as const;

export type ListingTab = (typeof LISTING_TABS)[number];

/** Tab captions live in the dictionary; this module only knows their keys, because
 *  it also runs where no translator is available (tests, route helpers). */
export const TAB_LABEL_KEYS: Record<ListingTab, string> = {
  shortlist: "listings.tabs.shortlist",
  maybe: "listings.tabs.maybe",
  all: "listings.tabs.all",
  discarded: "listings.tabs.discarded",
};

/** Back-link caption per origin — one key each rather than "Back to {tab}", so a
 *  language that inflects the tab name after the preposition can still get it right. */
const BACK_LABEL_KEYS: Record<ListingTab, string> = {
  shortlist: "listings.back.shortlist",
  maybe: "listings.back.maybe",
  all: "listings.back.all",
  discarded: "listings.back.discarded",
};

export function isListingTab(value: string | undefined): value is ListingTab {
  return value != null && (LISTING_TABS as readonly string[]).includes(value);
}

/** `/listings/<id>?from=<origin>[&<query>]` — `from` comes first, an existing
 *  `from` inside `query` is dropped so it can never be duplicated. */
export function buildListingHref(id: string, from: string, query?: URLSearchParams): string {
  const params = new URLSearchParams();
  params.set("from", from);
  if (query) {
    for (const [key, value] of query) {
      if (key === "from") continue;
      params.append(key, value);
    }
  }
  return `/listings/${id}?${params.toString()}`;
}

/** Where the back link on a detail page points, plus the key of its caption. The
 *  caller renders it with `t.raw(link.labelKey, link.labelVars)`. */
export type BackLink = {
  href: string;
  labelKey: string;
  labelVars?: Record<string, string | number>;
};

export function parseBackHref(from: string | undefined, query: URLSearchParams): BackLink {
  if (from === "search") {
    const rest = new URLSearchParams();
    for (const [key, value] of query) {
      if (key === "from") continue;
      rest.append(key, value);
    }
    const qs = rest.toString();
    return { href: qs ? `/search?${qs}` : "/search", labelKey: "listings.back.toSearch" };
  }
  if (isListingTab(from)) {
    return { href: `/listings?tab=${from}`, labelKey: BACK_LABEL_KEYS[from] };
  }
  return { href: "/listings?tab=shortlist", labelKey: "listings.back.toListings" };
}
