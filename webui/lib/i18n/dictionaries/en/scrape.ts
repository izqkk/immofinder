/**
 * The "search jobs" screen: the wizard that turns a pasted portal URL into a job, and
 * the manager that edits the jobs Fredy already knows about.
 */
export const scrape = {
  title: "Search jobs",
  intro:
    "A search job is a saved search on a property portal. ImmoFinder re-runs it every {interval} minutes and checks whether anything new turned up. Whatever it finds lands in this app, under Lists and in swipe mode.",

  /** Shown instead of the whole screen when the Fredy API credentials are unset. */
  configMissing: {
    title: "Fredy credentials are missing",
    body: "Job management signs in to Fredy with Fredy's own admin account, and no credentials are configured yet. Add FREDY_API_USER and FREDY_API_PASSWORD to the .env file that sits next to your docker-compose.yml:",
    restart:
      "Use the same user name and password you sign in to Fredy with, then restart the stack so this web UI picks them up.",
  },

  loadFailed: {
    title: "Could not load the search jobs",
    authFailed: "Fredy rejected the login — check the credentials.",
    notConfigured: "The Fredy credentials are missing.",
    detail: "Fredy reported: {detail}",
    unknownError: "unknown error",
  },

  wizard: {
    title: "Create a search job",
    description:
      "Search and filter on a portal such as ImmoScout24 the way you normally would, then paste the address from your browser's address bar here. ImmoFinder works out the portal by itself and checks that the search actually returns something.",
    urlLabel: "Paste the address of the portal search",
    urlPlaceholder: "https://www.immobilienscout24.de/Suche/…",
    urlMissing: "Paste an address first",
    check: "Check",
    detected: {
      reachable: "✓ {portal} detected — address reachable",
      hits: {
        one: "✓ {portal} detected — {count} match",
        other: "✓ {portal} detected — {count} matches",
      },
      hitsFirstPage: {
        one: "✓ {portal} detected — {count} match on the first page",
        other: "✓ {portal} detected — {count} matches on the first page",
      },
    },
    nameLabel: "Job name",
    namePlaceholder: "e.g. IS24 Berlin",
    nameHint: "Only used to tell the jobs apart in the list — pick whatever you like.",
    submit: "Create job",
    submitHint: "Check first, then create — that way no broken address ends up in a job.",
    created: {
      title: "Job created",
      description: "It runs from the next cycle onwards.",
    },
    createFailed: "Could not create the job",
  },

  manager: {
    intervalLabel: "Scrape interval (min)",
    saveInterval: "Save interval",
    newJob: "New job",
    runAll: "Run all jobs",
    empty: "No search jobs yet. The wizard above creates the first one.",
    defaultName: "New job",
    untitled: "Untitled job",
    namePlaceholder: "Job name",
    state: {
      running: "running now",
      active: "active",
      paused: "paused",
    },
    enabled: "on",
    disabled: "off",
    activeHits: {
      one: "{count} active match",
      other: "{count} active matches",
    },
    lastRun: "last run {age} ago",
    confirmDelete: "Delete the job “{name}”?",

    providers: {
      label: "Search addresses per portal",
      hint: "The address of a portal search you have already filtered — for new addresses, let the wizard above check them first.",
      urlPlaceholder: "https://www.immobilienscout24.de/Suche/…",
      remove: "Remove address",
      add: "Add address",
    },

    spec: {
      minRooms: {
        label: "Min. rooms",
        hint: "Listings with fewer rooms are never imported in the first place.",
      },
      minSize: {
        label: "Min. size (m²)",
        hint: "Smaller flats are skipped.",
      },
      maxPrice: {
        label: "Max. price (€)",
        hint: "Upper limit for the rent as the portal states it — anything dearer is dropped.",
      },
    },

    blacklist: {
      label: "Blacklist (one term per line)",
      hint: "Words that must not appear in the title — matching listings are thrown away.",
      placeholder: "swap\nshared room\nfurnished short-term",
    },

    run: "Run now",

    toast: {
      saved: "Job saved",
      saveFailed: "Could not save the job",
      runNeedsSave: "Save the job before running it",
      started: "Job started",
      alreadyRunning: "Job is already running",
      startedDescription: "New matches will show up shortly.",
      startFailed: "Could not start the job",
      deleted: "Job deleted",
      deleteFailed: "Could not delete the job",
      allStarted: "All jobs started",
      intervalSaved: "Interval saved",
      intervalFailed: "Could not save the interval",
    },
  },

  trigger: {
    label: "Search for new listings",
    started: "Search started — running in the background",
    alreadyRunning: "A search is already running",
    notConfigured: {
      title: "Fredy credentials are missing",
      description: "Set FREDY_API_USER and FREDY_API_PASSWORD in your .env file.",
    },
    authFailed: "Fredy rejected the login",
    failed: "Could not start the search",
  },
};
