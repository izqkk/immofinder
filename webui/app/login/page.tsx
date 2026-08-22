import type { Metadata } from "next";
import { LocaleToggle } from "@/components/locale-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${t("login.signIn")} — ${t("common.appName")}`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Login form — plain HTML posting to `/login/submit`, so it works without any
 * JavaScript. The error state travels as a query parameter and never says more
 * than "wrong password".
 *
 * The language switcher is here as well: this is the first page a new visitor sees,
 * and the choice has to be reachable before there is a session to hang it off.
 */
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next)) ?? "/";
  const failed = first(params.error) === "1";

  // Already signed in → straight through, no pointless form.
  if (await getSession()) redirect(next);

  const t = await getT();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t("common.appName")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login.prompt")}</p>
          </div>
          <LocaleToggle />
        </div>

        <form method="post" action="/login/submit" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t("login.password")}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="h-11"
              aria-invalid={failed || undefined}
              aria-describedby={failed ? "login-error" : undefined}
            />
          </div>

          {failed ? (
            <p id="login-error" role="alert" className="text-sm font-medium text-destructive">
              {t("login.wrongPassword")}
            </p>
          ) : null}

          <Button type="submit" className="h-11 w-full">
            {t("login.signIn")}
          </Button>
        </form>
      </div>
    </main>
  );
}
