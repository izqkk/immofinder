import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { ContactedButton } from "@/components/contacted-button";
import { PlaceLink } from "@/components/place-link";
import { providerLabel } from "@/lib/providers";
import { buildMapsHref } from "@/lib/maps";
import { originFromSettings } from "@/lib/geo";
import { getSettings } from "@/lib/settings";
import { DetailActions, ExpandableDescription } from "./detail-actions";
import { getListing } from "@/lib/listings";
import { parseBackHref } from "@/lib/back-link";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatDistanceKm, formatEur, relativeAge } from "@/lib/i18n/format";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    if (Array.isArray(value)) for (const v of value) params.append(key, v);
    else params.append(key, value);
  }
  return params;
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  await requirePageSession();
  const t = await getT();
  const { id } = await params;
  const sp = await searchParams;
  const listing = getListing(id);
  if (!listing) notFound();

  const from = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  const back = parseBackHref(from, toSearchParams(sp));
  const portal = providerLabel(listing.provider);
  const gone = listing.availability?.status === "gone";
  const mapsHref = buildMapsHref(listing, originFromSettings(getSettings()));
  // Formatted on the server — that keeps the output independent of the browser locale.
  const contactedLabel =
    listing.contactedAt != null
      ? t("listings.contact.on", { date: formatDate(listing.contactedAt, t.locale) })
      : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <Link
        href={back.href}
        className="inline-flex h-11 items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t.raw(back.labelKey, back.labelVars)}
      </Link>

      {listing.deleted ? (
        <div className="rounded-lg border border-score-weak/40 bg-score-weak-soft px-4 py-2 text-sm">
          {t("listings.detail.deletedNotice")}
        </div>
      ) : null}

      {/* Hero: image capped in height on mobile, side by side with the key facts
          from md upwards — so title, price and CTA are visible without scrolling. */}
      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt=""
            className="max-h-[45vh] w-full rounded-lg bg-surface-sunken object-cover md:max-h-[60vh]"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
            {t("common.listing.noImage")}
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium">
                {portal}
              </span>
              <StarRating score={listing.score} />
              {gone ? (
                <span className="rounded-full bg-score-weak px-2.5 py-1 text-xs font-medium text-score-weak-foreground">
                  {t("listings.gone")}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold leading-tight">
              {listing.title ?? t("common.listing.untitled")}
            </h1>
            <PlaceLink
              text={listing.address?.trim() || t("listings.detail.unknownAddress")}
              distanceKm={listing.distanceKm}
              href={mapsHref}
            />
          </div>

          <div className="space-y-2">
            <a
              href={listing.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center rounded-md bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              {t("listings.detail.openOn", { portal })}
            </a>
            <ContactedButton
              listingId={listing.id}
              contactedAt={listing.contactedAt}
              contactedLabel={contactedLabel}
              className="w-full items-center"
              buttonClassName="h-12 w-full"
            />
          </div>

          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="text-3xl font-bold leading-none tracking-tight">
                {formatEur(listing.price, t.locale)}
              </div>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{t("common.facts.size")}</dt>
                <dd>
                  {listing.size ? `${listing.size} ${t("common.units.sqm")}` : t("common.none")}
                </dd>
                <dt className="text-muted-foreground">{t("common.facts.rooms")}</dt>
                <dd>{listing.rooms || t("common.none")}</dd>
                <dt className="text-muted-foreground">{t("common.facts.distance")}</dt>
                <dd>
                  {formatDistanceKm(
                    listing.distanceKm == null ? null : listing.distanceKm * 1000,
                    t.locale,
                  )}
                </dd>
                <dt className="text-muted-foreground">{t("common.facts.added")}</dt>
                <dd>
                  {t("listings.detail.addedAgo", { age: relativeAge(listing.created_at, t) })}
                </dd>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {listing.scoreReasons.length > 0 ? (
        <details className="rounded-lg border bg-card px-4">
          <summary className="flex h-12 cursor-pointer list-none items-center justify-between text-sm font-medium">
            {t("score.title")}
            <span className="text-muted-foreground">▾</span>
          </summary>
          <ul className="list-inside list-disc space-y-1 pb-4 text-sm text-muted-foreground">
            {listing.scoreReasons.map((reason, i) => (
              <li key={i}>{t.raw(reason.key, reason.vars)}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {listing.description ? <ExpandableDescription text={listing.description} /> : null}

      <DetailActions listingId={listing.id} deleted={listing.deleted} />
    </div>
  );
}
