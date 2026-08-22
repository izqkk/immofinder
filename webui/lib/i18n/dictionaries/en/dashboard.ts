/** Start screen: the swipe call to action, the four stat tiles, the provider split. */
export const dashboard = {
  hero: {
    unrated: {
      one: "{count} unrated listing",
      other: "{count} unrated listings",
    },
    unratedHint: "Sort them by swiping — shortlist, maybe, or gone.",
    allRated: "All caught up",
    allRatedHint:
      "Nothing left to rate. Start a new search — fresh listings land in the swipe stack on their own.",
    startSwiping: "Start swiping",
  },
  tiles: {
    unrated: "Unrated",
    // "Shortlist" is the app's own term and stays untranslated in both languages.
    shortlist: "Shortlist",
    good: "Top offers ({min}+)",
    newest: "Newest listing",
  },
  providers: {
    title: "Where the listings come from",
    empty: "No listings in the database yet.",
    /** Share of one portal — English sets no space before the percent sign. */
    share: "{percent}%",
  },
};
