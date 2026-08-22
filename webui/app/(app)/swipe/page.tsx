import { SwipeDeck } from "./swipe-deck";
import { getSwipeDeck } from "@/lib/listings";
import { originFromSettings } from "@/lib/geo";
import { getSettings } from "@/lib/settings";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  await requirePageSession();
  const deck = getSwipeDeck();
  // Settings belong on the server — the card only receives the finished origin.
  const mapsOrigin = originFromSettings(getSettings());

  // The deck owns the full viewport below the header: cancel the padding the
  // layout applies to every other page so nothing scrolls at 360×640.
  return (
    <div className="-mx-4 -mb-24 -mt-6 md:-mb-6">
      <SwipeDeck initial={deck} mapsOrigin={mapsOrigin} />
    </div>
  );
}
