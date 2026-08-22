import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCard } from "@/components/listing-card";
import { ListingFilterBar } from "@/components/listing-filter-bar";
import { getAvailableProviders, parseListingQuery, queryListings } from "@/lib/listings";
import { getSettings } from "@/lib/settings";
import { originFromSettings } from "@/lib/geo";
import { buildListingHref } from "@/lib/back-link";
import type { TFunction, TranslationKey } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import type { EnrichedListing, ListingStatus } from "@/lib/types";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

// The listing tabs already name these three states; reusing their labels keeps a
// pill on the search page and its tab in the lists from saying different things.
const STATUS_LABEL_KEY: Partial<Record<ListingStatus, TranslationKey>> = {
  shortlist: "listings.tabs.shortlist",
  maybe: "listings.tabs.maybe",
  discarded: "listings.tabs.discarded",
};

/** Initial page size — the DB can return hundreds of hits, rendering them all is slow. */
const PAGE_SIZE = 60;

/**
 * Status pills laid over the card image (bottom-right), so a card with a status
 * keeps the same height as its row neighbours.
 * The spacer mirrors the card's `aspect-video` image box.
 */
function StatusOverlay({ listing, t }: { listing: EnrichedListing; t: TFunction }) {
  const labelKey = STATUS_LABEL_KEY[listing.status];
  if (!labelKey && !listing.deleted) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
      <div className="relative aspect-video w-full">
        <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1">
          {listing.deleted ? (
            <span className="rounded-full bg-score-weak px-2.5 py-1 text-xs font-medium text-score-weak-foreground">
              {t("search.statusDeleted")}
            </span>
          ) : null}
          {labelKey ? (
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
              {t(labelKey)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Current URL params, so a listing opened from here links back into this search. */
function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    if (Array.isArray(value)) for (const v of value) params.append(key, v);
    else params.append(key, value);
  }
  return params;
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  await requirePageSession();
  const t = await getT();
  const sp = await searchParams;
  const query = parseListingQuery(sp);
  const results = queryListings(query);
  const providers = getAvailableProviders();
  const settings = getSettings();
  const defaultSort = settings.defaultSort;
  const mapsOrigin = originFromSettings(settings);
  const urlQuery = toSearchParams(sp);

  // How many results are rendered — grows in PAGE_SIZE steps via the "show more" link.
  const showParam = Number(Array.isArray(sp.show) ? sp.show[0] : sp.show);
  const shown = Math.min(
    results.length,
    Number.isFinite(showParam) && showParam > 0 ? Math.ceil(showParam) : PAGE_SIZE,
  );
  const visible = results.slice(0, shown);
  const moreParams = new URLSearchParams(urlQuery);
  moreParams.set("show", String(shown + PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("search.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("search.intro")}</p>
      </div>

      <ListingFilterBar providers={providers} defaultSort={defaultSort} />

      <p className="text-sm text-muted-foreground">
        {t.plural("search.hits", results.length)}
        {shown < results.length ? ` ${t("search.shown", { count: shown })}` : null}
      </p>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("search.empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((l) => (
              <div key={l.id} className="relative">
                <StatusOverlay listing={l} t={t} />
                <ListingCard
                  listing={l}
                  href={buildListingHref(l.id, "search", urlQuery)}
                  mapsOrigin={mapsOrigin}
                />
              </div>
            ))}
          </div>

          {shown < results.length ? (
            <div className="flex justify-center pt-2">
              <Link
                href={`/search?${moreParams.toString()}`}
                scroll={false}
                prefetch={false}
                className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-card px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {t("search.showMore", { count: Math.min(PAGE_SIZE, results.length - shown) })}
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
