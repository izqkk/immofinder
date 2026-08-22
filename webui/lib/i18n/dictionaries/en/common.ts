/**
 * Labels shared across more than one screen. Feature-specific wording lives in the
 * namespace file for that feature, so translators can work on one screen at a time.
 */
export const common = {
  appName: "ImmoFinder",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  close: "Close",
  delete: "Delete",
  restore: "Restore",
  undo: "Undo",
  reset: "Reset",
  refresh: "Refresh",
  more: "Show more",
  less: "Show less",
  none: "—",
  language: "Language",
  theme: {
    toggle: "Toggle theme",
  },
  time: {
    justNow: "just now",
    minutes: "{count} min",
    hours: "{count} h",
    days: {
      one: "{count} day",
      other: "{count} days",
    },
  },
  /** Stand-ins for listing data the portal did not provide. */
  listing: {
    noImage: "No image",
    untitled: "Untitled",
    unknownPlace: "Location unknown",
  },
  facts: {
    rooms: "Rooms",
    size: "Size",
    distance: "Distance to destination",
    added: "Added",
  },
  units: {
    sqm: "m²",
    km: "km",
    roomsShort: "rm",
  },
  errors: {
    saveFailed: "Could not save.",
  },
};
