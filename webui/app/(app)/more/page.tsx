import Link from "next/link";
import { ChevronRight, LogOut, Radar, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logoutAction } from "@/app/actions";
import type { TranslationKey } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { requirePageSession } from "@/lib/session";

type MoreEntry = {
  href: string;
  /** Reuses the nav labels, so a destination is never named two different things. */
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: LucideIcon;
};

const ENTRIES: MoreEntry[] = [
  {
    href: "/scrape",
    labelKey: "nav.items.scrape",
    descriptionKey: "more.entries.scrape",
    icon: Radar,
  },
  {
    href: "/settings",
    labelKey: "nav.items.settings",
    descriptionKey: "more.entries.settings",
    icon: Settings,
  },
];

export default async function MorePage() {
  await requirePageSession();
  const t = await getT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("more.title")}</h1>

      <ul className="space-y-3">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <li key={entry.href}>
              <Link
                href={entry.href}
                className="flex min-h-[72px] items-center gap-4 rounded-lg bg-card p-4 shadow-card transition-colors hover:bg-accent"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-soft-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium">{t(entry.labelKey)}</span>
                  <span className="block text-sm text-muted-foreground">
                    {t(entry.descriptionKey)}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}

        {/* Sign out — clears the session cookie; works without JavaScript too. */}
        <li>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-[72px] w-full items-center gap-4 rounded-lg bg-card p-4 text-left shadow-card transition-colors hover:bg-accent"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-soft-foreground">
                <LogOut className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium">{t("more.logout.label")}</span>
                <span className="block text-sm text-muted-foreground">
                  {t("more.logout.description")}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
