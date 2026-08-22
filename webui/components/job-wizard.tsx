"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fredySaveJobAction, validateSearchUrlAction } from "@/app/actions";
import type { ValidateSearchUrlResult } from "@/app/actions";
import { useT } from "@/lib/i18n/client";
import { suggestJobName } from "@/lib/search-url";

/**
 * Wizard for creating a search job: paste the address, have it checked, confirm the
 * name, done. The check takes the same route as the scraper, so an address the portal
 * rejects shows up right away instead of failing silently later on.
 */
export function JobWizard() {
  const t = useT();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [check, setCheck] = useState<ValidateSearchUrlResult | null>(null);
  const [checking, startCheck] = useTransition();
  const [saving, startSave] = useTransition();

  const changeUrl = (value: string) => {
    setUrl(value);
    setCheck(null);
    if (!nameTouched) setName(suggestJobName(value) ?? "");
  };

  const runCheck = () => {
    const value = url.trim();
    if (value === "") {
      toast.error(t("scrape.wizard.urlMissing"));
      return;
    }
    startCheck(async () => {
      const res = await validateSearchUrlAction(value);
      setCheck(res);
      if (res.ok && !nameTouched) setName(suggestJobName(value) ?? res.label);
    });
  };

  const createJob = () => {
    if (!check?.ok) return;
    const provider = check.provider;
    startSave(async () => {
      const res = await fredySaveJobAction({
        name: name.trim() || check.label,
        enabled: true,
        provider: [{ id: provider, url: url.trim(), enabled: true }],
        blacklist: [],
        notificationAdapter: [],
        shareWithUsers: [],
        spatialFilter: null,
        specFilter: null,
      });
      if (res.ok) {
        toast.success(t("scrape.wizard.created.title"), {
          description: t("scrape.wizard.created.description"),
        });
        setUrl("");
        setName("");
        setNameTouched(false);
        setCheck(null);
        router.refresh();
      } else {
        toast.error(t("scrape.wizard.createFailed"), { description: res.detail ?? res.reason });
      }
    });
  };

  /** Success line: portal recognised, plus how many matches the check could see. */
  const detected = (res: Extract<ValidateSearchUrlResult, { ok: true }>): string => {
    const portal = res.label;
    if (res.hits == null) return t("scrape.wizard.detected.reachable", { portal });
    const key = res.exact ? "scrape.wizard.detected.hits" : "scrape.wizard.detected.hitsFirstPage";
    return t.plural(key, res.hits, { portal });
  };

  /**
   * Failure line. The server action hands back a translation key plus its variables
   * rather than a finished sentence, so the diagnostic reads correctly in both
   * languages — the wizard resolves it here instead of printing it verbatim.
   */
  const rejected = (res: Extract<ValidateSearchUrlResult, { ok: false }>): string =>
    t.raw(res.reason, res.reasonVars);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="size-4 text-brand" /> {t("scrape.wizard.title")}
        </CardTitle>
        <CardDescription>{t("scrape.wizard.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wizard-url" className="text-xs">
            {t("scrape.wizard.urlLabel")}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="wizard-url"
              inputMode="url"
              autoComplete="off"
              className="h-11"
              placeholder={t("scrape.wizard.urlPlaceholder")}
              value={url}
              onChange={(ev) => changeUrl(ev.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 sm:w-32"
              onClick={runCheck}
              disabled={checking}
            >
              {checking ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
              {t("scrape.wizard.check")}
            </Button>
          </div>
        </div>

        {check ? (
          check.ok ? (
            <p className="rounded-lg bg-score-good-soft p-3 text-sm text-score-good">
              <span>{detected(check)}</span>
            </p>
          ) : (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-score-weak-soft p-3 text-sm text-score-weak"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{rejected(check)}</span>
            </p>
          )
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="wizard-name" className="text-xs">
            {t("scrape.wizard.nameLabel")}
          </Label>
          <Input
            id="wizard-name"
            className="h-11"
            placeholder={t("scrape.wizard.namePlaceholder")}
            value={name}
            onChange={(ev) => {
              setNameTouched(true);
              setName(ev.target.value);
            }}
          />
          <p className="text-xs text-muted-foreground">{t("scrape.wizard.nameHint")}</p>
        </div>

        <Button
          type="button"
          className="h-11 w-full sm:w-auto"
          onClick={createJob}
          disabled={saving || !check?.ok}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
          {t("scrape.wizard.submit")}
        </Button>
        {!check?.ok ? (
          <p className="text-xs text-muted-foreground">{t("scrape.wizard.submitHint")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
