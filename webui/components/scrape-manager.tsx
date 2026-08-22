"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Play, Plus, Trash2, X, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fredyListJobsAction,
  fredySaveJobAction,
  fredyRunJobAction,
  fredyDeleteJobAction,
  fredySetIntervalAction,
  triggerScrapeAction,
} from "@/app/actions";
import type { FredyJob, JobInput, ProviderEntry } from "@/lib/fredy-jobs";
import { useT } from "@/lib/i18n/client";
import { relativeAge } from "@/lib/i18n/format";
import type { TFunction } from "@/lib/i18n";

const PROVIDERS = [
  { id: "immoscout", label: "ImmoScout24" },
  { id: "immowelt", label: "Immowelt" },
  { id: "kleinanzeigen", label: "Kleinanzeigen" },
  { id: "wgGesucht", label: "WG-Gesucht" },
];

type EditJob = {
  key: string;
  id?: string;
  name: string;
  enabled: boolean;
  provider: ProviderEntry[];
  blacklistText: string;
  minRooms: string;
  minSize: string;
  maxPrice: string;
  notificationAdapter: unknown[];
  shared_with_user: string[];
  spatialFilter: unknown | null;
  running?: boolean;
  found?: number;
};

function toEdit(j: FredyJob, key: string): EditJob {
  return {
    key,
    id: j.id,
    name: j.name ?? "",
    enabled: j.enabled,
    provider: Array.isArray(j.provider) ? j.provider : [],
    blacklistText: (Array.isArray(j.blacklist) ? j.blacklist : []).join("\n"),
    minRooms: j.specFilter?.minRooms != null ? String(j.specFilter.minRooms) : "",
    minSize: j.specFilter?.minSize != null ? String(j.specFilter.minSize) : "",
    maxPrice: j.specFilter?.maxPrice != null ? String(j.specFilter.maxPrice) : "",
    notificationAdapter: j.notificationAdapter ?? [],
    shared_with_user: j.shared_with_user ?? [],
    spatialFilter: j.spatialFilter ?? null,
    running: j.running,
    found: j.numberOfFoundListings,
  };
}

function toInput(e: EditJob, t: TFunction): JobInput {
  const minRooms = e.minRooms.trim() === "" ? undefined : Number(e.minRooms);
  const minSize = e.minSize.trim() === "" ? undefined : Number(e.minSize);
  const maxPrice = e.maxPrice.trim() === "" ? undefined : Number(e.maxPrice);
  const spec: JobInput["specFilter"] =
    minRooms == null && minSize == null && maxPrice == null
      ? null
      : {
          ...(Number.isFinite(minRooms as number) ? { minRooms: minRooms as number } : {}),
          ...(Number.isFinite(minSize as number) ? { minSize: minSize as number } : {}),
          ...(Number.isFinite(maxPrice as number) ? { maxPrice: maxPrice as number } : {}),
        };
  return {
    jobId: e.id,
    name: e.name.trim() || t("scrape.manager.untitled"),
    enabled: e.enabled,
    provider: e.provider
      .map((p) => ({ id: p.id, url: p.url.trim(), enabled: p.enabled !== false }))
      .filter((p) => p.url.length > 0),
    blacklist: e.blacklistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    notificationAdapter: e.notificationAdapter,
    shareWithUsers: e.shared_with_user,
    spatialFilter: e.spatialFilter,
    specFilter: spec,
  };
}

/** A job's state in one word, the way the list shows it. */
function jobState(e: EditJob, t: TFunction): { label: string; className: string } {
  if (e.running)
    return {
      label: t("scrape.manager.state.running"),
      className: "bg-brand-soft text-brand-soft-foreground",
    };
  if (e.enabled)
    return { label: t("scrape.manager.state.active"), className: "bg-score-good-soft text-score-good" };
  return { label: t("scrape.manager.state.paused"), className: "bg-muted text-muted-foreground" };
}

export function ScrapeManager({
  initialJobs,
  interval,
  lastRun = null,
}: {
  initialJobs: FredyJob[];
  interval: number;
  lastRun?: number | null;
}) {
  const t = useT();
  const keyCounter = useRef(0);
  const [jobs, setJobs] = useState<EditJob[]>(() =>
    initialJobs.map((j) => toEdit(j, `job-${j.id}`)),
  );
  const [intervalMin, setIntervalMin] = useState(String(interval));
  const [pending, start] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const reload = async () => {
    const r = await fredyListJobsAction();
    if (r.ok) setJobs(r.data.map((j) => toEdit(j, `job-${j.id}`)));
  };

  const patch = (key: string, p: Partial<EditJob>) =>
    setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...p } : j)));

  const addJob = () => {
    keyCounter.current += 1;
    setJobs((js) => [
      {
        key: `new-${keyCounter.current}`,
        name: t("scrape.manager.defaultName"),
        enabled: true,
        provider: [{ id: "immoscout", url: "", enabled: true }],
        blacklistText: "",
        minRooms: "",
        minSize: "",
        maxPrice: "",
        notificationAdapter: [],
        shared_with_user: [],
        spatialFilter: null,
      },
      ...js,
    ]);
  };

  const saveJob = (e: EditJob) => {
    setBusyKey(e.key);
    start(async () => {
      const res = await fredySaveJobAction(toInput(e, t));
      setBusyKey(null);
      if (res.ok) {
        toast.success(t("scrape.manager.toast.saved"));
        await reload();
      } else {
        toast.error(t("scrape.manager.toast.saveFailed"), { description: res.detail ?? res.reason });
      }
    });
  };

  const runJob = (e: EditJob) => {
    if (!e.id) {
      toast.error(t("scrape.manager.toast.runNeedsSave"));
      return;
    }
    setBusyKey(e.key);
    start(async () => {
      const res = await fredyRunJobAction(e.id!);
      setBusyKey(null);
      if (res.ok)
        toast.success(
          res.already
            ? t("scrape.manager.toast.alreadyRunning")
            : t("scrape.manager.toast.started"),
          { description: t("scrape.manager.toast.startedDescription") },
        );
      else toast.error(t("scrape.manager.toast.startFailed"), { description: res.detail ?? res.reason });
    });
  };

  const deleteJob = (e: EditJob) => {
    if (!e.id) {
      setJobs((js) => js.filter((j) => j.key !== e.key));
      return;
    }
    if (!confirm(t("scrape.manager.confirmDelete", { name: e.name }))) return;
    setBusyKey(e.key);
    start(async () => {
      const res = await fredyDeleteJobAction(e.id!);
      setBusyKey(null);
      if (res.ok) {
        toast.success(t("scrape.manager.toast.deleted"));
        await reload();
      } else toast.error(t("scrape.manager.toast.deleteFailed"), { description: res.detail ?? res.reason });
    });
  };

  const runAll = () =>
    start(async () => {
      const r = await triggerScrapeAction();
      if (r.ok) toast.success(t("scrape.manager.toast.allStarted"));
      else toast.error(t("scrape.manager.toast.startFailed"), { description: r.detail ?? r.reason });
    });

  const saveInterval = () =>
    start(async () => {
      const r = await fredySetIntervalAction(Number(intervalMin) || 60);
      if (r.ok) toast.success(t("scrape.manager.toast.intervalSaved"));
      else toast.error(t("scrape.manager.toast.intervalFailed"), { description: r.detail ?? r.reason });
    });

  // Provider-row helpers
  const setProvider = (key: string, idx: number, p: Partial<ProviderEntry>) =>
    setJobs((js) =>
      js.map((j) =>
        j.key === key
          ? { ...j, provider: j.provider.map((pr, i) => (i === idx ? { ...pr, ...p } : pr)) }
          : j,
      ),
    );
  const addProvider = (key: string) =>
    setJobs((js) =>
      js.map((j) =>
        j.key === key
          ? { ...j, provider: [...j.provider, { id: "immoscout", url: "", enabled: true }] }
          : j,
      ),
    );
  const removeProvider = (key: string, idx: number) =>
    setJobs((js) =>
      js.map((j) =>
        j.key === key ? { ...j, provider: j.provider.filter((_, i) => i !== idx) } : j,
      ),
    );

  return (
    <div className="space-y-4">
      {/* Global controls */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="interval" className="text-xs">
                {t("scrape.manager.intervalLabel")}
              </Label>
              <Input
                id="interval"
                type="number"
                min={1}
                className="h-11 w-28"
                value={intervalMin}
                onChange={(ev) => setIntervalMin(ev.target.value)}
              />
            </div>
            <Button type="button" variant="outline" className="h-11" onClick={saveInterval} disabled={pending}>
              {t("scrape.manager.saveInterval")}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={addJob} disabled={pending}>
              <Plus className="size-4" /> {t("scrape.manager.newJob")}
            </Button>
            <Button type="button" className="h-11" onClick={runAll} disabled={pending}>
              <RefreshCw className={pending ? "animate-spin" : ""} /> {t("scrape.manager.runAll")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t("scrape.manager.empty")}
          </CardContent>
        </Card>
      ) : null}

      {jobs.map((e) => {
        const busy = pending && busyKey === e.key;
        return (
          <Card key={e.key} className={e.enabled ? "" : "opacity-70"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">
                  <Input
                    value={e.name}
                    onChange={(ev) => patch(e.key, { name: ev.target.value })}
                    className="h-8 font-semibold"
                    placeholder={t("scrape.manager.namePlaceholder")}
                  />
                </CardTitle>
                <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm">
                  <Switch checked={e.enabled} onCheckedChange={(v) => patch(e.key, { enabled: v })} />
                  {e.enabled ? t("scrape.manager.enabled") : t("scrape.manager.disabled")}
                </label>
              </div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className={`rounded-full px-2 py-0.5 font-medium ${jobState(e, t).className}`}>
                  {jobState(e, t).label}
                </span>
                {e.found != null ? (
                  <span>{t.plural("scrape.manager.activeHits", e.found)}</span>
                ) : null}
                {lastRun != null ? (
                  <span>· {t("scrape.manager.lastRun", { age: relativeAge(lastRun, t) })}</span>
                ) : null}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider URLs */}
              <div className="space-y-2">
                <Label className="text-xs">{t("scrape.manager.providers.label")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("scrape.manager.providers.hint")}
                </p>
                {e.provider.map((pr, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Select
                      value={pr.id}
                      onValueChange={(v) => setProvider(e.key, idx, { id: v })}
                    >
                      <SelectTrigger className="h-11 w-36 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={pr.url}
                      onChange={(ev) => setProvider(e.key, idx, { url: ev.target.value })}
                      placeholder={t("scrape.manager.providers.urlPlaceholder")}
                      className="h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={t("scrape.manager.providers.remove")}
                      onClick={() => removeProvider(e.key, idx)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="h-11" onClick={() => addProvider(e.key)}>
                  <Plus className="size-4" /> {t("scrape.manager.providers.add")}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("scrape.manager.spec.minRooms.label")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={e.minRooms}
                    placeholder={t("filters.anyValue")}
                    onChange={(ev) => patch(e.key, { minRooms: ev.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("scrape.manager.spec.minRooms.hint")}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("scrape.manager.spec.minSize.label")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={e.minSize}
                    placeholder={t("filters.anyValue")}
                    onChange={(ev) => patch(e.key, { minSize: ev.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("scrape.manager.spec.minSize.hint")}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("scrape.manager.spec.maxPrice.label")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={e.maxPrice}
                    placeholder={t("filters.anyValue")}
                    onChange={(ev) => patch(e.key, { maxPrice: ev.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("scrape.manager.spec.maxPrice.hint")}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("scrape.manager.blacklist.label")}</Label>
                <p className="text-xs text-muted-foreground">{t("scrape.manager.blacklist.hint")}</p>
                <Textarea
                  value={e.blacklistText}
                  onChange={(ev) => patch(e.key, { blacklistText: ev.target.value })}
                  placeholder={t("scrape.manager.blacklist.placeholder")}
                  className="min-h-[90px] font-mono text-xs"
                />
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button type="button" className="h-11" onClick={() => saveJob(e)} disabled={busy}>
                  {busy ? t("common.saving") : t("common.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => runJob(e)}
                  disabled={busy || !e.id}
                >
                  <Play className="size-4" /> {t("scrape.manager.run")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto h-11 text-destructive hover:text-destructive"
                  onClick={() => deleteJob(e)}
                  disabled={busy}
                >
                  <Trash2 className="size-4" /> {t("common.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
