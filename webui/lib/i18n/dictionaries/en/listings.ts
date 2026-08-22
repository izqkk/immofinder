/**
 * The listing list, the cards it is built from, and the detail page behind them.
 * `back.*` is addressed by key from `lib/back-link.ts`, which has no translator of
 * its own and therefore hands the caller a key instead of a finished sentence.
 */
export const listings = {
  title: "Listings",
  gone: "No longer available",

  tabs: {
    shortlist: "Shortlist",
    maybe: "Maybe",
    all: "All",
    discarded: "Discarded",
  },

  back: {
    toSearch: "Back to search",
    toListings: "Back to listings",
    shortlist: "Back to shortlist",
    maybe: "Back to maybe",
    all: "Back to all listings",
    discarded: "Back to discarded",
  },

  empty: {
    shortlist: "Nothing on the shortlist yet. Start swiping.",
    maybe: "No “maybe” decisions yet.",
    all: "No listings match the current filters.",
    discarded: "Nothing discarded yet.",
  },

  /** Shortlist and Maybe split into listings still to contact and ones already done. */
  sections: {
    toContact: "Not contacted yet ({count})",
    contacted: "Contacted ({count})",
  },

  card: {
    open: "Open ↗",
    /** Google Maps link on the address line — opens transit directions. */
    directions: "Open transit directions from here to your start address in Google Maps",
  },

  contact: {
    badge: "Contacted",
    done: "Contacted ✓",
    ask: "Contacted?",
    mark: "Mark as contacted",
    unmark: "Mark as not contacted",
    on: "contacted on {date}",
  },

  select: {
    start: "Select",
    end: "Done",
    item: "Select listing",
    count: "{count} selected",
    allShort: "All",
    all: "Select all ({count})",
    clear: "Clear selection",
    deleted: {
      one: "{count} deleted",
      other: "{count} deleted",
    },
  },

  actions: {
    unDiscard: "Move back to undecided",
  },

  detail: {
    deletedNotice: "This listing is deleted and hidden from the normal lists.",
    unknownAddress: "Address unknown",
    openOn: "Open on {portal} ↗",
    addedAgo: "{age} ago",
    description: "Description",
    delete: "Delete listing",
  },
};
