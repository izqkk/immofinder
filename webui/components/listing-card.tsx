"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { ContactedButton } from "@/components/contacted-button";
import { PlaceLink, placeLine } from "@/components/place-link";
import { providerLabel } from "@/lib/providers";
import { buildMapsHref, type MapsOrigin } from "@/lib/maps";
import { useT } from "@/lib/i18n/client";
import { formatEur } from "@/lib/i18n/format";
import type { TFunction } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { EnrichedListing } from "@/lib/types";

/** `4 rm · 96 m²` — only the facts we actually have. */
function factsLine(listing: EnrichedListing, t: TFunction) {
  const parts: string[] = [];
  if (listing.rooms) parts.push(`${listing.rooms} ${t("common.units.roomsShort")}`);
  if (listing.size) parts.push(`${listing.size} ${t("common.units.sqm")}`);
  return parts.join(" · ");
}

/** Compact listing tile: image with overlays, price, two fact lines and a footer
 *  with the external "open" link plus whatever action the parent supplies. */
export function ListingCard({
  listing,
  href,
  action,
  mapsOrigin = null,
}: {
  listing: EnrichedListing;
  /** Detail link, built with `buildListingHref` so the back link knows the origin. */
  href?: string;
  /** Contextual action (delete, restore, …) rendered next to "Open ↗". */
  action?: ReactNode;
  /** Start address for the maps link — the card is also rendered from client views,
   *  so it arrives as a prop from the respective server page. */
  mapsOrigin?: MapsOrigin;
}) {
  const t = useT();
  const detailHref = href ?? `/listings/${listing.id}`;
  const facts = factsLine(listing, t);
  const place = placeLine(listing);
  const mapsHref = buildMapsHref(listing, mapsOrigin);
  const gone = listing.availability?.status === "gone";
  const contacted = listing.contactedAt != null;

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden shadow-card",
        // Contacted cards step back visually — sunken surface plus a quieter image.
        contacted && "bg-surface-sunken",
      )}
    >
      <Link href={detailHref} className="relative block aspect-video bg-surface-sunken">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt=""
            className={cn("size-full object-cover", contacted && "opacity-55")}
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            {t("common.listing.noImage")}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {providerLabel(listing.provider)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-1 backdrop-blur">
          <StarRating score={listing.score} />
        </span>
        <span className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
          {gone ? (
            <span className="rounded-full bg-score-weak px-2.5 py-1 text-xs font-medium text-score-weak-foreground">
              {t("listings.gone")}
            </span>
          ) : null}
          {contacted ? (
            <span className="ml-auto rounded-full bg-score-good px-2.5 py-1 text-xs font-medium text-score-good-foreground">
              {t("listings.contact.badge")}
            </span>
          ) : null}
        </span>
      </Link>

      <CardContent className="flex-1 space-y-1 p-4">
        <Link href={detailHref} className="block">
          {/* The title carries the card — it sits above the price and is larger. */}
          <p className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight">
            {listing.title?.trim() || t("common.listing.untitled")}
          </p>
          <div className="flex items-baseline gap-3 pt-1.5">
            <span className="text-base font-bold leading-none">
              {formatEur(listing.price, t.locale)}
            </span>
            {facts ? <span className="text-sm font-medium text-foreground/80">{facts}</span> : null}
          </div>
        </Link>
        {/* A link of its own (route in Google Maps) — hence a sibling of the detail
            link and not nested inside it: nested <a> is invalid HTML. */}
        <PlaceLink
          text={place || t("common.listing.unknownPlace")}
          distanceKm={listing.distanceKm}
          href={mapsHref}
        />
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2 p-4 pt-0">
        <a
          href={listing.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 flex-1 basis-24 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          {t("listings.card.open")}
        </a>
        <ContactedButton listingId={listing.id} contactedAt={listing.contactedAt} />
        {action}
      </CardFooter>
    </Card>
  );
}
