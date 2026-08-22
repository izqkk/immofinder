import { Card, CardContent } from "@/components/ui/card";
import { ScrapeManager } from "@/components/scrape-manager";
import { JobWizard } from "@/components/job-wizard";
import { isFredyConfigured } from "@/lib/fredy-api";
import { listJobs, getGeneralInfo } from "@/lib/fredy-jobs";
import { getT } from "@/lib/i18n/server";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ScrapePage() {
  await requirePageSession();
  const t = await getT();

  if (!isFredyConfigured()) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">{t("scrape.title")}</h1>
        <Card>
          <CardContent className="space-y-3 py-8 text-sm">
            <p className="font-medium">{t("scrape.configMissing.title")}</p>
            <p className="text-muted-foreground">{t("scrape.configMissing.body")}</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
              {"FREDY_API_USER=<fredy-user>\nFREDY_API_PASSWORD=<fredy-password>"}
            </pre>
            <p className="text-muted-foreground">{t("scrape.configMissing.restart")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobsRes = await listJobs();
  const generalRes = await getGeneralInfo();
  const interval = generalRes.ok ? generalRes.data.interval : 60;
  const lastRun = generalRes.ok ? generalRes.data.lastRun : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("scrape.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("scrape.intro", { interval })}</p>
      </div>

      <JobWizard />

      {jobsRes.ok ? (
        <ScrapeManager initialJobs={jobsRes.data} interval={interval} lastRun={lastRun} />
      ) : (
        <Card>
          <CardContent className="space-y-1 py-10 text-center text-sm text-muted-foreground">
            <p className="font-medium">{t("scrape.loadFailed.title")}</p>
            <p>
              {jobsRes.reason === "auth_failed"
                ? t("scrape.loadFailed.authFailed")
                : jobsRes.reason === "not_configured"
                  ? t("scrape.loadFailed.notConfigured")
                  : t("scrape.loadFailed.detail", {
                      detail: jobsRes.detail ?? t("scrape.loadFailed.unknownError"),
                    })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
