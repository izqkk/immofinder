/** The password gate — the only screen a visitor sees before signing in. */
export const login = {
  signIn: "Anmelden",
  prompt: "Bitte das gemeinsame Passwort eingeben.",
  password: "Passwort",
  /** Deliberately vague: it never reveals whether anything else was wrong. */
  wrongPassword: "Falsches Passwort",
  errors: {
    notConfigured: "Server ist nicht konfiguriert.",
    rateLimited: "Zu viele Fehlversuche. Bitte später erneut versuchen.",
    httpsRequired:
      "HTTPS erforderlich: Über eine unverschlüsselte Verbindung wird keine Sitzung " +
      "ausgestellt (REQUIRE_HTTPS=1). Bitte die Seite über https aufrufen bzw. den " +
      "Reverse Proxy prüfen.",
  },
};
