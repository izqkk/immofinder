export const scrape = {
  title: "Such-Aufträge",
  intro:
    "Ein Such-Auftrag ist eine gespeicherte Suche auf einem Immobilien-Portal. ImmoFinder ruft sie alle {interval} Minuten automatisch ab und schaut nach, ob es etwas Neues gibt. Alles, was dabei gefunden wird, landet in dieser App unter „Listen“ und im Swipe-Modus.",

  configMissing: {
    title: "Fredy-Zugangsdaten fehlen",
    body: "Die Job-Verwaltung meldet sich bei Fredy mit Fredys eigenem Admin-Konto an, und dafür sind bisher keine Zugangsdaten hinterlegt. Trage FREDY_API_USER und FREDY_API_PASSWORD in die .env-Datei ein, die neben deiner docker-compose.yml liegt:",
    restart:
      "Nimm dieselben Zugangsdaten, mit denen du dich bei Fredy anmeldest, und starte den Stack danach neu, damit diese Web-Oberfläche sie übernimmt.",
  },

  loadFailed: {
    title: "Such-Aufträge konnten nicht geladen werden",
    authFailed: "Fredy hat den Login abgelehnt — bitte die Zugangsdaten prüfen.",
    notConfigured: "Die Fredy-Zugangsdaten fehlen.",
    detail: "Fredy meldet: {detail}",
    unknownError: "unbekannter Fehler",
  },

  wizard: {
    title: "Neuen Such-Auftrag anlegen",
    description:
      "Auf einem Portal wie ImmoScout24 ganz normal suchen, filtern und dann die Adresse aus der Adresszeile des Browsers hier einfügen. ImmoFinder erkennt das Portal selbst und prüft, ob die Suche funktioniert.",
    urlLabel: "Adresse der Portal-Suche einfügen",
    urlPlaceholder: "https://www.immobilienscout24.de/Suche/…",
    urlMissing: "Bitte zuerst eine Adresse einfügen",
    check: "Prüfen",
    detected: {
      reachable: "✓ {portal} erkannt — Adresse erreichbar",
      hits: {
        one: "✓ {portal} erkannt — {count} Treffer",
        other: "✓ {portal} erkannt — {count} Treffer",
      },
      hitsFirstPage: {
        one: "✓ {portal} erkannt — {count} Treffer auf der ersten Seite",
        other: "✓ {portal} erkannt — {count} Treffer auf der ersten Seite",
      },
    },
    nameLabel: "Name des Auftrags",
    namePlaceholder: "z. B. IS24 Berlin",
    nameHint: "Nur zur Wiedererkennung in der Liste — frei wählbar.",
    submit: "Auftrag anlegen",
    submitHint: "Erst prüfen, dann anlegen — so landet keine kaputte Adresse im Auftrag.",
    created: {
      title: "Auftrag angelegt",
      description: "Er läuft ab dem nächsten Durchlauf.",
    },
    createFailed: "Anlegen fehlgeschlagen",
  },

  manager: {
    intervalLabel: "Scrape-Intervall (Min.)",
    saveInterval: "Intervall speichern",
    newJob: "Neuer Job",
    runAll: "Alle laufen lassen",
    empty: "Noch keine Such-Aufträge. Der Assistent oben legt den ersten an.",
    defaultName: "Neuer Job",
    untitled: "Unbenannter Job",
    namePlaceholder: "Job-Name",
    state: {
      running: "läuft gerade",
      active: "aktiv",
      paused: "pausiert",
    },
    enabled: "aktiv",
    disabled: "aus",
    activeHits: {
      one: "{count} aktiver Treffer",
      other: "{count} aktive Treffer",
    },
    lastRun: "letzter Lauf vor {age}",
    confirmDelete: "Job „{name}“ wirklich löschen?",

    providers: {
      label: "Such-Adressen je Portal",
      hint: "Adresse einer fertig gefilterten Portal-Suche — neue Adressen am besten oben über den Assistenten prüfen lassen.",
      urlPlaceholder: "https://www.immobilienscout24.de/Suche/…",
      remove: "Adresse entfernen",
      add: "Adresse hinzufügen",
    },

    spec: {
      minRooms: {
        label: "min. Zimmer",
        hint: "Angebote mit weniger Zimmern werden gar nicht erst übernommen.",
      },
      minSize: {
        label: "min. Größe (m²)",
        hint: "Kleinere Wohnungen werden übersprungen.",
      },
      maxPrice: {
        label: "max. Preis (€)",
        hint: "Obergrenze für die Miete laut Portal — teurere Angebote fallen raus.",
      },
    },

    blacklist: {
      label: "Blacklist (ein Begriff pro Zeile)",
      hint: "Wörter, die im Titel nicht vorkommen dürfen — solche Treffer werden verworfen.",
      placeholder: "Tausch\nWG-Zimmer\nMöbliert auf Zeit",
    },

    run: "Jetzt laufen",

    toast: {
      saved: "Job gespeichert",
      saveFailed: "Speichern fehlgeschlagen",
      runNeedsSave: "Erst speichern, dann laufen lassen",
      started: "Job gestartet",
      alreadyRunning: "Job läuft bereits",
      startedDescription: "Neue Treffer erscheinen in Kürze.",
      startFailed: "Start fehlgeschlagen",
      deleted: "Job gelöscht",
      deleteFailed: "Löschen fehlgeschlagen",
      allStarted: "Alle Jobs gestartet",
      intervalSaved: "Intervall gespeichert",
      intervalFailed: "Intervall speichern fehlgeschlagen",
    },
  },

  trigger: {
    label: "Nach neuen Angeboten suchen",
    started: "Suche gestartet — läuft im Hintergrund",
    alreadyRunning: "Suche läuft bereits",
    notConfigured: {
      title: "Fredy-Zugangsdaten fehlen",
      description: "FREDY_API_USER und FREDY_API_PASSWORD in der .env-Datei setzen.",
    },
    authFailed: "Fredy hat den Login abgelehnt",
    failed: "Start fehlgeschlagen",
  },
};
