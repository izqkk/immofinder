"use client";

import { MapPin } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { formatDistanceKm } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { EnrichedListing } from "@/lib/types";

/** Address of a card — the distance is rendered next to it (see PlaceLink). */
export function placeLine(listing: EnrichedListing): string {
  return listing.address?.trim() ?? "";
}

/**
 * The place line as a link to Google Maps (transit directions, new tab).
 * Without `href` — the listing has neither an address nor coordinates — it stays
 * plain text, so there is never an empty or dead line.
 *
 * `stopPointer` is for drag surfaces (the swipe card): a tap there must not start a
 * swipe gesture. Only set it from client components.
 */
export function PlaceLink({
  text,
  distanceKm,
  href,
  className,
  stopPointer,
}: {
  text: string;
  /** Straight-line distance to the start address; sits on the right and is NEVER truncated. */
  distanceKm?: number | null;
  href: string | null;
  className?: string;
  stopPointer?: boolean;
}) {
  const t = useT();
  // The shared formatter works in metres and renders an em dash for missing or
  // implausible values; the place line drops the distance entirely instead.
  const formatted = formatDistanceKm(distanceKm == null ? null : distanceKm * 1000, t.locale);
  const distance = formatted === "—" ? null : formatted;
  // The distance is the more important figure and must not fall victim to a long
  // address: truncate the address, pin the distance down with shrink-0.
  const body = (
    <>
      <span className="truncate">{text}</span>
      {distance ? (
        <span className="ml-auto shrink-0 font-medium text-foreground">{distance}</span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
        {body}
      </p>
    );
  }
  const directions = t("listings.card.directions");
  const stop = stopPointer ? (e: React.PointerEvent) => e.stopPropagation() : undefined;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={directions}
      aria-label={`${text}${distance ? `, ${distance}` : ""} — ${directions}`}
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      className={cn(
        "flex min-h-11 w-full items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline",
        className,
      )}
    >
      <MapPin className="size-4 shrink-0" aria-hidden />
      {body}
    </a>
  );
}
