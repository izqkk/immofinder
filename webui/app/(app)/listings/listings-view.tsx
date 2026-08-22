"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckSquare, Trash2, Undo2, RotateCcw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { ListingFilterBar } from "@/components/listing-filter-bar";
import {
  bulkDeleteAction,
  deleteListingAction,
  restoreDeletedAction,
  setListingStatusAction,
} from "@/app/actions";
import { buildListingHref, LISTING_TABS, TAB_LABEL_KEYS, type ListingTab } from "@/lib/back-link";
import { useT } from "@/lib/i18n/client";
import type { MapsOrigin } from "@/lib/maps";
import type { EnrichedListing } from "@/lib/types";

const EMPTY_KEYS: Record<ListingTab, string> = {
  shortlist: "listings.empty.shortlist",
  maybe: "listings.empty.maybe",
  all: "listings.empty.all",
  discarded: "listings.empty.discarded",
};

/** Tabs that keep listings still to contact apart from ones already contacted. */
const SPLIT_TABS: ListingTab[] = ["shortlist", "maybe"];

type Buckets = Record<ListingTab, EnrichedListing[]>;

export function ListingsView({
  buckets,
  initialTab,
  providers,
  defaultSort,
  mapsOrigin = null,
}: {
  buckets: Buckets;
  initialTab: ListingTab;
  providers: string[];
  defaultSort: string;
  /** Start address for the cards' maps links — supplied by the server page. */
  mapsOrigin?: MapsOrigin;
}) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ListingTab>(initialTab);
  const [syncedTab, setSyncedTab] = useState<ListingTab>(initialTab);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undoIds, setUndoIds] = useState<string[] | null>(null);
  const [pending, start] = useTransition();

  // Follow the URL when it changes from the outside (back link, browser history).
  if (initialTab !== syncedTab) {
    setSyncedTab(initialTab);
    setTab(initialTab);
  }

  function changeTab(next: string) {
    const tabNext = next as ListingTab;
    setTab(tabNext);
    setSelected(new Set());
    // Keep the tab in the URL so detail pages can link back into it.
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabNext);
    router.replace(`/listings?${params.toString()}`, { scroll: false });
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(buckets[tab].map((l) => l.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function runBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    start(async () => {
      await bulkDeleteAction(ids);
      setSelected(new Set());
      setUndoIds(ids);
    });
  }

  function runBulkRestore() {
    const ids = [...selected];
    if (ids.length === 0) return;
    start(async () => {
      await restoreDeletedAction(ids);
      setSelected(new Set());
    });
  }

  function deleteOne(id: string) {
    start(async () => {
      await deleteListingAction(id);
      setUndoIds([id]);
    });
  }

  function restoreOne(id: string) {
    start(async () => {
      await restoreDeletedAction([id]);
    });
  }

  function unDiscardOne(id: string) {
    start(async () => {
      await setListingStatusAction(id, "unseen");
    });
  }

  function runUndo() {
    if (!undoIds) return;
    const ids = undoIds;
    start(async () => {
      await restoreDeletedAction(ids);
      setUndoIds(null);
    });
  }

  /** Contextual footer action of a card — depends on the listing, not the tab. */
  function cardAction(l: EnrichedListing) {
    if (l.deleted) {
      return (
        <Button
          size="icon"
          variant="secondary"
          className="size-11 shrink-0"
          aria-label={t("common.restore")}
          title={t("common.restore")}
          disabled={pending}
          onClick={() => restoreOne(l.id)}
        >
          <RotateCcw />
        </Button>
      );
    }
    return (
      <>
        {l.status === "discarded" ? (
          <Button
            size="icon"
            variant="secondary"
            className="size-11 shrink-0"
            aria-label={t("listings.actions.unDiscard")}
            title={t("listings.actions.unDiscard")}
            disabled={pending}
            onClick={() => unDiscardOne(l.id)}
          >
            <Undo2 />
          </Button>
        ) : null}
        <Button
          size="icon"
          variant="outline"
          className="size-11 shrink-0 text-score-weak"
          aria-label={t("common.delete")}
          title={t("common.delete")}
          disabled={pending}
          onClick={() => deleteOne(l.id)}
        >
          <Trash2 />
        </Button>
      </>
    );
  }

  /** One card plus its selection overlay (select mode). */
  function renderCard(l: EnrichedListing, key: ListingTab) {
    return (
      <div key={l.id} className="relative">
        {selectMode ? (
          <button
            type="button"
            onClick={() => toggle(l.id)}
            aria-label={t("listings.select.item")}
            aria-pressed={selected.has(l.id)}
            className={`absolute inset-0 z-20 rounded-lg border-2 transition-colors ${
              selected.has(l.id)
                ? "border-primary bg-primary/10"
                : "border-transparent hover:bg-foreground/5"
            }`}
          >
            {/* Mirrors the card's aspect-video image and centers the marker in it.
                The corners are taken (provider pill, stars, availability badge) and
                the bottom edge can slip under the sticky bulk bar on the first row. */}
            <span className="relative flex aspect-video w-full items-center justify-center">
              <span
                className={`flex size-11 items-center justify-center rounded-full border-2 backdrop-blur transition-colors ${
                  selected.has(l.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-foreground/25 bg-background/90"
                }`}
              >
                {selected.has(l.id) ? <Check className="size-6" /> : null}
              </span>
            </span>
          </button>
        ) : null}
        <ListingCard
          listing={l}
          href={buildListingHref(l.id, key)}
          action={selectMode ? null : cardAction(l)}
          mapsOrigin={mapsOrigin}
        />
      </div>
    );
  }

  function renderGrid(items: EnrichedListing[], key: ListingTab) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((l) => renderCard(l, key))}
      </div>
    );
  }

  /** Shortlist & Maybe: listings still to contact first, contacted ones quieter below. */
  function renderSplit(items: EnrichedListing[], key: ListingTab) {
    const open = items.filter((l) => l.contactedAt == null);
    const done = items.filter((l) => l.contactedAt != null);
    return (
      <div className="space-y-8">
        {open.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {t("listings.sections.toContact", { count: open.length })}
            </h2>
            {renderGrid(open, key)}
          </section>
        ) : null}
        {done.length > 0 ? (
          <section className="space-y-3 opacity-80">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("listings.sections.contacted", { count: done.length })}
            </h2>
            {renderGrid(done, key)}
          </section>
        ) : null}
      </div>
    );
  }

  const hasDeleted = buckets[tab].some((l) => l.deleted);

  return (
    <div className={`space-y-4 ${selectMode ? "pb-40 md:pb-28" : "pb-24"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("listings.title")}</h1>
        <Button
          variant={selectMode ? "default" : "outline"}
          size="sm"
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          <CheckSquare /> {selectMode ? t("listings.select.end") : t("listings.select.start")}
        </Button>
      </div>

      <ListingFilterBar providers={providers} defaultSort={defaultSort} />

      <Tabs value={tab} onValueChange={changeTab} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {LISTING_TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t.raw(TAB_LABEL_KEYS[key])}{" "}
              <span className="ml-1 text-xs text-muted-foreground">({buckets[key].length})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {LISTING_TABS.map((key) => {
          const listings = buckets[key];
          return (
            <TabsContent key={key} value={key}>
              {listings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {t.raw(EMPTY_KEYS[key])}
                  </CardContent>
                </Card>
              ) : SPLIT_TABS.includes(key) ? (
                renderSplit(listings, key)
              ) : (
                renderGrid(listings, key)
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Sticky bulk-action bar */}
      {selectMode ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-card/90 shadow-lg backdrop-blur md:bottom-0">
          <div className="container mx-auto flex items-center gap-2 px-4 py-2">
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {t("listings.select.count", { count: selected.size })}
            </span>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="min-h-11 px-3"
                onClick={selectAll}
                disabled={pending}
              >
                <span className="sm:hidden">{t("listings.select.allShort")}</span>
                <span className="hidden sm:inline">
                  {t("listings.select.all", { count: buckets[tab].length })}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={t("listings.select.clear")}
                title={t("listings.select.clear")}
                onClick={clearSelection}
                disabled={pending || selected.size === 0}
              >
                <X />
              </Button>
              {hasDeleted ? (
                <Button
                  className="min-h-11 px-3"
                  aria-label={t("common.restore")}
                  title={t("common.restore")}
                  onClick={runBulkRestore}
                  disabled={pending || selected.size === 0}
                >
                  <RotateCcw />
                  <span className="hidden sm:inline">{t("common.restore")}</span>
                </Button>
              ) : null}
              <Button
                variant="destructive"
                className="min-h-11 px-3"
                onClick={runBulkDelete}
                disabled={pending || selected.size === 0}
              >
                <Trash2 /> {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Undo toast after a delete */}
      {undoIds && !selectMode ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
          <span>{t.plural("listings.select.deleted", undoIds.length)}</span>
          <Button size="sm" variant="outline" onClick={runUndo} disabled={pending}>
            <Undo2 /> {t("common.undo")}
          </Button>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setUndoIds(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
