"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, Meh, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { ScrapeButton } from "@/components/scrape-button";
import { setListingStatusAction } from "@/app/actions";
import type { MapsOrigin } from "@/lib/maps";
import type { EnrichedListing } from "@/lib/types";
import { SwipeCard, type DragOffset, type ExitDir } from "./swipe-card";

type Action = "shortlist" | "maybe" | "discarded";
type Decision = { listing: EnrichedListing; status: Action };

const EXIT_DIR: Record<Action, ExitDir> = {
  shortlist: "right",
  discarded: "left",
  maybe: "down",
};

const DRAG_THRESHOLD = 90;
const EXIT_MS = 300;

export function SwipeDeck({
  initial,
  mapsOrigin = null,
}: {
  initial: EnrichedListing[];
  /** Origin for the maps links — settings are only ever read on the server. */
  mapsOrigin?: MapsOrigin;
}) {
  const t = useT();
  const [queue, setQueue] = useState(initial);
  const [history, setHistory] = useState<Decision[]>([]);
  const [flying, setFlying] = useState<{
    listing: EnrichedListing;
    dir: ExitDir;
    from: DragOffset | null;
  } | null>(null);
  const [drag, setDrag] = useState<DragOffset | null>(null);
  const dragStart = useRef<DragOffset | null>(null);

  const current = queue[0];
  const next = queue[1];

  /** Puts a card back at the front of the deck (optimistic rollback / undo). */
  const restore = useCallback((listing: EnrichedListing) => {
    setQueue((q) => (q.some((l) => l.id === listing.id) ? q : [listing, ...q]));
  }, []);

  /** Fire-and-forget persistence; on failure the card comes back. */
  const persist = useCallback(
    async (listing: EnrichedListing, status: Action) => {
      try {
        const res = await setListingStatusAction(listing.id, status);
        if (!res?.ok) throw new Error("not ok");
      } catch {
        setHistory((h) => h.filter((x) => x.listing.id !== listing.id));
        restore(listing);
        toast.error(t("common.errors.saveFailed"));
      }
    },
    [restore, t],
  );

  /** Optimistic: the card leaves the deck now, the server call follows. */
  const decide = useCallback(
    (action: Action, from: DragOffset | null = null) => {
      const listing = queue[0];
      if (!listing) return;
      setQueue((q) => q.slice(1));
      setHistory((h) => [...h, { listing, status: action }]);
      setFlying({ listing, dir: EXIT_DIR[action], from });
      void persist(listing, action);
    },
    [queue, persist],
  );

  /** Undo one decision — also optimistic, reverted when the server refuses. */
  const undoDecision = useCallback(
    (decision: Decision) => {
      const { listing, status } = decision;
      setHistory((h) => h.filter((x) => x.listing.id !== listing.id));
      restore(listing);
      void (async () => {
        try {
          const res = await setListingStatusAction(listing.id, "unseen");
          if (!res?.ok) throw new Error("not ok");
        } catch {
          setQueue((q) => q.filter((l) => l.id !== listing.id));
          setHistory((h) =>
            h.some((x) => x.listing.id === listing.id) ? h : [...h, { listing, status }],
          );
          toast.error(t("common.errors.saveFailed"));
        }
      })();
    },
    [restore, t],
  );

  const undoLast = useCallback(() => {
    const last = history[history.length - 1];
    if (last) undoDecision(last);
  }, [history, undoDecision]);

  // --- drag gesture -------------------------------------------------------
  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    setDrag({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }
  function onPointerUp() {
    const d = drag;
    dragStart.current = null;
    setDrag(null);
    if (!d) return;
    if (d.x > DRAG_THRESHOLD) decide("shortlist", d);
    else if (d.x < -DRAG_THRESHOLD) decide("discarded", d);
    else if (d.y > DRAG_THRESHOLD) decide("maybe", d);
  }

  // --- keyboard shortcuts (stay enabled while requests are in flight) -----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undoLast();
      } else if (e.key === "ArrowLeft") decide("discarded");
      else if (e.key === "ArrowRight") decide("shortlist");
      else if (e.key === "ArrowDown") decide("maybe");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undoLast]);

  const clearFlying = useCallback(() => setFlying(null), []);

  const dragHint =
    drag && drag.x > 40
      ? ("like" as const)
      : drag && drag.x < -40
        ? ("nope" as const)
        : drag && drag.y > 40
          ? ("maybe" as const)
          : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--nav-h)-var(--tab-h)-var(--status-h,0px))] w-full max-w-md flex-col gap-3 px-4 py-3 md:h-[calc(100dvh-var(--nav-h)-var(--status-h,0px))]">
      {current ? (
        <div className="relative min-h-0 flex-1">
          {next ? <SwipeCard listing={next} mapsOrigin={mapsOrigin} stacked /> : null}
          <SwipeCard
            key={current.id}
            listing={current}
            mapsOrigin={mapsOrigin}
            drag={drag}
            dragHint={dragHint}
            remaining={queue.length}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {flying ? (
            <FlyingCard
              key={`fly-${flying.listing.id}`}
              listing={flying.listing}
              mapsOrigin={mapsOrigin}
              dir={flying.dir}
              from={flying.from}
              onDone={clearFlying}
            />
          ) : null}
        </div>
      ) : (
        <EmptyState decided={history.length} />
      )}

      {/* action row — pinned to the bottom of the one-screen container */}
      <div className="flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={undoLast}
          disabled={history.length === 0}
          aria-label={t("swipe.actions.undo")}
          className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:text-muted-foreground"
        >
          <Undo2 className="size-5" />
        </button>

        <div className="flex items-center gap-4">
          <ActionButton
            onClick={() => decide("discarded")}
            label={t("swipe.actions.discard")}
            disabled={!current}
            className="bg-score-weak text-score-weak-foreground"
          >
            <X className="size-6" />
          </ActionButton>
          <ActionButton
            onClick={() => decide("maybe")}
            label={t("swipe.actions.maybe")}
            disabled={!current}
            className="bg-score-mid text-score-mid-foreground"
          >
            <Meh className="size-6" />
          </ActionButton>
          <ActionButton
            onClick={() => decide("shortlist")}
            label={t("swipe.actions.like")}
            disabled={!current}
            className="bg-score-good text-score-good-foreground"
          >
            <Heart className="size-6" />
          </ActionButton>
        </div>

        {/* keeps the three action circles optically centred */}
        <span aria-hidden className="size-11" />
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  disabled,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex size-14 items-center justify-center rounded-full shadow-card transition-transform active:scale-95 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Copy of the decided card that animates out after it already left the deck. */
function FlyingCard({
  listing,
  mapsOrigin,
  dir,
  from,
  onDone,
}: {
  listing: EnrichedListing;
  mapsOrigin: MapsOrigin;
  dir: ExitDir;
  from: DragOffset | null;
  onDone: () => void;
}) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGo(true));
    const timer = setTimeout(onDone, EXIT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [onDone]);
  return (
    <div className="pointer-events-none absolute inset-0">
      <SwipeCard
        listing={listing}
        mapsOrigin={mapsOrigin}
        exitDir={go ? dir : null}
        drag={go ? null : from}
      />
    </div>
  );
}

function EmptyState({ decided }: { decided: number }) {
  const t = useT();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-card px-6 text-center shadow-card">
      <p className="text-lg font-semibold">{t("swipe.empty.title")}</p>
      <p className="text-sm text-muted-foreground">
        {decided > 0 ? t.plural("swipe.empty.sorted", decided) : t("swipe.empty.nothing")}
      </p>
      <div className="flex flex-col items-center gap-2">
        <Button asChild>
          <Link href="/listings?tab=shortlist">{t("swipe.empty.viewShortlist")}</Link>
        </Button>
        <ScrapeButton variant="ghost" size="sm" />
      </div>
    </div>
  );
}
