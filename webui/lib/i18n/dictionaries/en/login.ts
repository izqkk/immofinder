/** The password gate — the only screen a visitor sees before signing in. */
export const login = {
  signIn: "Sign in",
  prompt: "Enter the shared password.",
  password: "Password",
  /** Deliberately vague: it never reveals whether anything else was wrong. */
  wrongPassword: "Wrong password",
  errors: {
    notConfigured: "Server is not configured.",
    rateLimited: "Too many failed attempts. Please try again later.",
    httpsRequired:
      "HTTPS required: no session is issued over an unencrypted connection " +
      "(REQUIRE_HTTPS=1). Open the site over https, or check your reverse proxy.",
  },
};
