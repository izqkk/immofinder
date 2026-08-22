/**
 * The settings screen. Its descriptions double as the in-app documentation for the
 * scoring model, so they explain *why* a knob exists, not just what it is called.
 */
export const settings = {
  title: "Settings",
  subtitle: "Affects scoring, swiping, lists and search. Saving applies to all three tabs at once.",

  /** Placeholder for a numeric field where 0 means "no limit". */
  off: "off",

  tabs: {
    scoring: "Scoring",
    filters: "Filters",
    display: "Display",
  },

  origin: {
    title: "Start location",
    description:
      "The address every listing's distance is measured from. Without coordinates, distances fall back to the destination Fredy already computed them against.",
    address: "Address",
    placeholder: "Street, postcode, town",
    lookup: "Look up",
    coordsSet: "Coordinates set: {lat}, {lng}",
    coordsFound: "✓ {name} ({lat}, {lng})",
    found: "Start location found — remember to save",
    errors: {
      empty: "Enter an address first",
      notFound: "Address not found",
    },
  },

  scoring: {
    intro:
      "Decides how a listing arrives at its star rating — from price, distance, rooms and size measured against your targets.",

    goals: {
      title: "Targets & household",
      description: "Who is searching, and what the score optimises for.",
      household: "Household size",
      sharedRoomMode: {
        label: "Shared-room mode",
        hint: "Look for a single room in a shared flat instead of a whole apartment. Single-room listings are no longer hidden or penalised, and the score ignores the room count.",
      },
      voterCount: "People in the household",
      targets: "Target values",
      budget: "Budget target (€/month, incl. utilities)",
      distance: "Distance target (km)",
    },

    weights: {
      title: "Score weights",
      description:
        "Relative weights of the four score components. They need not add up to 100 — a component without data (a listing with no price, say) stays neutral and the remaining components take over its share. 0 switches a component off.",
      main: "Main weights",
      price: "Price per person",
      distance: "Distance",
      rooms: "Rooms",
      size: "Size",
    },

    advanced: {
      toggle: "Advanced score tuning",

      budgetTolerance: {
        heading: "Budget tolerance",
        label: "Budget tolerance (%)",
        hint: "How far above the budget target a listing still earns points (default 25%).",
      },

      roomTiers: {
        heading: "Room tiers (% of full points)",
        ideal: "≥ people + 1",
        ok: "= people",
        tight: "fewer",
      },

      sqm: {
        heading: "Size per person",
        goodThreshold: "“Generous” from (m²/person)",
        okThreshold: "“Okay” from (m²/person)",
        good: "Generous",
        ok: "Okay",
        tight: "Cramped",
      },

      special: {
        heading: "Edge cases",
        neutral: {
          label: "Score without data (%)",
          hint: "The composite score used when price, distance, rooms and size are all missing.",
        },
        maxRooms: {
          label: "Max. plausible rooms",
          hint: "Anything higher counts as a parsing error, and the room count is treated as unknown.",
        },
        singleRoomFloor: {
          label: "Floor single rooms at 1★",
          hint: "Listings whose title reads like a single room in a shared flat are pinned to one star (no effect in shared-room mode). The terms used to detect them live in the Filters tab.",
        },
      },
    },
  },

  filters: {
    intro:
      "Removes matching listings from every view — lists, swipe and dashboard — instead of merely scoring them low.",

    hard: {
      title: "Hard filters",
      description:
        "0 or empty means off. Filtered listings stay findable from search via “Show deleted”. Listings with unknown values remain visible unless the “Unknown values” switches below say otherwise.",
      price: "Price",
      minPrice: "Min. price (€)",
      maxPrice: "Max. price (€)",
      roomsAndSize: "Rooms & size",
      minRooms: "Min. rooms",
      maxRooms: "Max. rooms",
      minSize: "Min. size (m²)",
      maxSize: "Max. size (m²)",
      minSqmPerPerson: {
        label: "Min. m² per person",
        hint: "Living space divided by the number of people in the household.",
      },
      ageAndDistance: "Age & distance",
      maxAgeDays: {
        label: "Max. age (days)",
        hint: "Hide listings older than this.",
      },
      maxDistance: "Max. distance (km, hard filter)",
      providers: "Providers (empty = all)",
    },

    keywords: {
      title: "Keywords",
      description: "Comma-separated terms; case does not matter.",
      exclude: {
        heading: "Exclude",
        label: "Exclude keywords",
        placeholder: "e.g. swap, foreclosure",
        hint: "A hit in the title or description hides the listing.",
        inAddress: {
          label: "Match exclude keywords against the address too",
          hint: "Checks the terms above against the listing's address as well.",
        },
        addressLabel: "Address exclusions",
        addressPlaceholder: "e.g. district name, neighbouring town",
        addressHint:
          "Terms matched against the address only — useful for ruling out whole districts or towns.",
      },
      require: {
        heading: "Required",
        label: "Required keywords",
        placeholder: "empty = off",
        hint: "Only show listings whose title or description contains at least one of these terms.",
      },
    },

    singleRoom: {
      title: "Single rooms",
      description:
        "Detection of listings that offer one room in a shared flat rather than a whole place (no effect in shared-room mode).",
      detection: "Detection",
      hideOneRoom: {
        label: "Hide one-room listings",
        hint: "Filters out everything with a room count of 1.",
      },
      hideByTitle: {
        label: "Hide single rooms detected by title",
        hint: "Removes listings outright when their title reads like a single room (terms below).",
      },
      terms: "Terms",
      patternsLabel: "Detection terms",
      patternsHint:
        "Separated by commas or line breaks. Hyphens and spaces between word parts are interchangeable when matching (“wg-zimmer” also finds “WG Zimmer” and “WGZimmer”). Used by the title filter above and by the 1★ score floor.",
    },

    unknown: {
      title: "Unknown values",
      description:
        "By default a listing without a given value stays visible — missing data counts as neutral. These switches remove it instead.",
      price: {
        label: "Hide listings without a price",
        hint: "Listings with no price disappear from every view.",
      },
      rooms: {
        label: "Hide listings without a room count",
        hint: "Listings with no room count disappear from every view.",
      },
      size: {
        label: "Hide listings without a size",
        hint: "Listings with no floor area disappear from every view.",
      },
      distance: {
        label: "Hide listings without a distance",
        hint: "Listings whose distance to the start location cannot be computed disappear from every view.",
      },
    },
  },

  display: {
    intro:
      "Controls how results are presented and ordered — thresholds, sorting, highlights and the swipe deck.",

    highlights: {
      title: "Highlights",
      description: "Marks matching listings with a gold border and a badge.",
      label: "Highlight keywords",
      placeholder: "e.g. balcony, period building, garden",
      hint: "Comma-separated.",
    },

    thresholds: {
      title: "Thresholds & lists",
      description:
        "Star thresholds for “good” and “weak”, the size of the dashboard shortlist, and the default sort order.",
      heading: "Star thresholds",
      good: "“Good” from (★)",
      weak: "“Weak” up to (★)",
      dashboardTopN: "Top picks on the dashboard (count)",
    },

    sort: {
      heading: "Sorting",
      label: "Default sort order",
    },

    deck: {
      title: "Swipe deck & data",
      heading: "Deck",
      size: "Deck size (cards)",
      order: "Deck order",
      options: {
        score: "Best first",
        newest: "Newest first",
      },
    },

    data: {
      heading: "Data source",
      loadLimit: {
        label: "Load limit (listings)",
        hint: "How many of the most recent active listings are read from the Fredy database for lists, search and the availability check.",
      },
    },
  },
};
