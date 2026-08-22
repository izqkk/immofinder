"use client";

import { StarRating } from "@/components/star-rating";
import { PlaceLink, placeLine } from "@/components/place-link";
import { providerLabel } from "@/lib/providers";
import { buildMapsHref, type MapsOrigin } from "@/lib/maps";
import { formatEur } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/client";
import type { TFunction } from "@/lib/i18n";
import type { EnrichedListing } from "@/lib/types";

export type ExitDir = "left" | "right" | "down";
export type DragOffset = { x: number; y: number };
export type DragHint = "like" | "nope" | "maybe" | null;

/** `4 rm · 96 m²` — only the facts we actually have. */
function factsLine(listing: EnrichedListing, t: TFunction) {
  const parts: string[] = [];
  if (listing.rooms) parts.push(`${listing.rooms} ${t("common.units.roomsShort")}`);
  if (listing.size) parts.push(`${listing.size} ${t("common.units.sqm")}`);
  return parts.join(" · ");
}

export function SwipeCard({
  listing,
  mapsOrigin = null,
  exitDir,
  stacked,
  drag,
  dragHint,
  remaining,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  listing: EnrichedListing;
  /** Origin for the maps link — arrives ready-made from the server page. */
  mapsOrigin?: MapsOrigin;
  exitDir?: ExitDir | null;
  stacked?: boolean;
  drag?: DragOffset | null;
  dragHint?: DragHint;
  remaining?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
}) {
  const t = useT();
  const transform = stacked
    ? "scale-95 translate-y-2 opacity-50"
    : exitDir === "left"
      ? "-translate-x-[130%] -rotate-12 opacity-0"
      : exitDir === "right"
        ? "translate-x-[130%] rotate-12 opacity-0"
        : exitDir === "down"
          ? "translate-y-[130%] opacity-0"
          : "translate-x-0 translate-y-0";
  // While dragging the card follows the finger without transition, otherwise it eases.
  const dragStyle: React.CSSProperties | undefined = drag
    ? {
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 22}deg)`,
        transition: "none",
      }
    : undefined;
  const interactive = !stacked;
  const facts = factsLine(listing, t);
  const place = placeLine(listing);
  const mapsHref = buildMapsHref(listing, mapsOrigin);

  return (
    <div
      inert={stacked ? true : undefined}
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-border/60 will-change-transform ${transform} ${
        drag ? "" : "transition-all duration-300"
      } ${interactive ? "touch-none select-none" : "pointer-events-none"}`}
      style={dragStyle}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerCancel : undefined}
    >
      {/* image area — shrinks first when the viewport is short */}
      <div className="relative min-h-0 flex-1 bg-surface-sunken">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt=""
            draggable={false}
            className="size-full object-cover"
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
        {remaining != null ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
            {t("swipe.card.remaining", { count: remaining })}
          </span>
        ) : null}

        {dragHint ? (
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-lg border-2 px-4 py-1.5 text-xl font-extrabold uppercase ${
              dragHint === "like"
                ? "left-6 -rotate-12 border-score-good text-score-good"
                : dragHint === "nope"
                  ? "right-6 rotate-12 border-score-weak text-score-weak"
                  : "left-1/2 -translate-x-1/2 border-score-mid text-score-mid"
            }`}
          >
            {dragHint === "like"
              ? t("swipe.hint.like")
              : dragHint === "nope"
                ? t("swipe.hint.nope")
                : t("swipe.hint.maybe")}
          </span>
        ) : null}
      </div>

      {/* info tile — natural height */}
      <div className="shrink-0 space-y-2 p-4">
        {/* The title carries the card — it sits above the price and is larger. */}
        <p className="line-clamp-2 text-xl font-semibold leading-snug tracking-tight">
          {listing.title?.trim() || t("common.listing.untitled")}
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold leading-none">
            {formatEur(listing.price, t.locale)}
          </span>
          {facts ? <span className="text-sm font-medium text-foreground/80">{facts}</span> : null}
        </div>
        {/* the card is a drag surface — the link must not start a gesture */}
        <PlaceLink
          text={place || t("common.listing.unknownPlace")}
          distanceKm={listing.distanceKm}
          href={mapsHref}
          stopPointer
        />
        <a
          href={listing.link}
          target="_blank"
          rel="noopener noreferrer"
          // the card is a drag surface — the link must not start a gesture
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="flex h-11 w-full items-center justify-center rounded-md bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          {t("swipe.card.openOn", { provider: providerLabel(listing.provider) })}
        </a>
      </div>
    </div>
  );
}
