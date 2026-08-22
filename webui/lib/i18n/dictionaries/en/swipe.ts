/** The swipe deck: drag stamps, the three action buttons, the card, the empty deck. */
export const swipe = {
  /**
   * Stamps that appear on the card while dragging. "Like" and "Nope" are the genre's
   * own vocabulary and stay in English in both dictionaries; "Maybe" is translated.
   */
  hint: {
    like: "Like",
    nope: "Nope",
    maybe: "Maybe",
  },
  /** Screen-reader labels for the icon-only buttons under the deck. */
  actions: {
    discard: "Discard",
    maybe: "Maybe",
    like: "Like",
    undo: "Undo last decision",
  },
  card: {
    remaining: "{count} left",
    openOn: "Open on {provider} ↗",
  },
  empty: {
    title: "Deck cleared",
    sorted: {
      one: "{count} listing sorted. New ones show up here on their own.",
      other: "{count} listings sorted. New ones show up here on their own.",
    },
    nothing: "Nothing to rate right now. New listings show up here on their own.",
    viewShortlist: "View shortlist",
  },
};
