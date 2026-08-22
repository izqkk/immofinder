export const status = {
  scrape: {
    starting: "Suche wird gestartet …",
    running: {
      one: "Suche läuft … ({count} Auftrag)",
      other: "Suche läuft … ({count} Aufträge)",
    },
  },
  availability: {
    running: "Verfügbarkeit wird geprüft …",
    progress: "Verfügbarkeit wird geprüft … {done}/{total}",
  },
  geocode: {
    running: "Adressen werden nachgeschlagen …",
    progress: "Adressen werden nachgeschlagen … {done}/{total}",
  },
  done: {
    scrape: {
      none: "Suche beendet — keine neuen Angebote",
      found: {
        one: "{count} neues Angebot gefunden",
        other: "{count} neue Angebote gefunden",
      },
    },
    availability: {
      none: "Verfügbarkeit geprüft — alle Angebote noch erreichbar",
      gone: {
        one: "Verfügbarkeit geprüft — {count} Angebot nicht mehr verfügbar",
        other: "Verfügbarkeit geprüft — {count} Angebote nicht mehr verfügbar",
      },
    },
    geocode: {
      none: "Adressen nachgeschlagen — keine neuen Koordinaten",
      resolved: {
        one: "Adressen nachgeschlagen — {count} Angebot verortet",
        other: "Adressen nachgeschlagen — {count} Angebote verortet",
      },
    },
  },
};
