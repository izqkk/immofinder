import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrapeButton } from "@/components/scrape-button";
import { StatTiles, type Tile } from "@/components/stat-tiles";
import { getDashboardStats } from "@/lib/listings";
import { providerLabel } from "@/lib/providers";
import { getSettings } from "@/lib/settings";
import { relativeAge } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageSession();
  const t = await getT();
  const stats = getDashboardStats();
  const settings = getSettings();

  // Unrated listings have no tab of their own in /listings — the swipe mode is the
  // view for them. The other tiles reuse existing URL parameters.
  const tiles: Tile[] = [
    { label: t("dashboard.tiles.unrated"), value: String(stats.unseen), href: "/swipe" },
    {
      label: t("dashboard.tiles.shortlist"),
      value: String(stats.shortlist),
      href: "/listings?tab=shortlist",
    },
    {
      label: t("dashboard.tiles.good", { min: settings.displayGoodScore }),
      value: String(stats.good),
      href: `/listings?tab=all&minScore=${settings.displayGoodScore}`,
    },
    {
      label: t("dashboard.tiles.newest"),
      value: stats.newestMs ? relativeAge(stats.newestMs, t) : t("common.none"),
      href: "/listings?tab=all&sort=newest",
    },
  ];

  const providerTotal = stats.perProvider.reduce((sum, p) => sum + p.n, 0);

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-lg bg-surface-raised p-6 shadow-card">
        {stats.unseen > 0 ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t.plural("dashboard.hero.unrated", stats.unseen)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.hero.unratedHint")}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("dashboard.hero.allRated")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.hero.allRatedHint")}</p>
          </>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {stats.unseen > 0 ? (
            <Button asChild size="lg" className="h-12">
              <Link href="/swipe">
                {t("dashboard.hero.startSwiping")} <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="h-12" disabled>
              {t("dashboard.hero.startSwiping")} <ArrowRight />
            </Button>
          )}
          <ScrapeButton size="lg" variant="outline" />
        </div>
      </section>

      <StatTiles tiles={tiles} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("dashboard.providers.title")}</h2>
        {providerTotal === 0 ? (
          <p className="rounded-lg bg-surface-raised p-6 text-sm text-muted-foreground shadow-card">
            {t("dashboard.providers.empty")}
          </p>
        ) : (
          <div className="space-y-4 rounded-lg bg-surface-raised p-5 shadow-card">
            {stats.perProvider.map((p) => {
              const share = (p.n / providerTotal) * 100;
              return (
                <div key={p.provider} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{providerLabel(p.provider)}</span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground tabular-nums">{p.n}</span> ·{" "}
                      {t("dashboard.providers.share", { percent: share.toFixed(0) })}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
