"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSettingsAction, geocodeStartAction } from "@/app/actions";
import { providerLabel } from "@/lib/providers";
import { useT } from "@/lib/i18n/client";
import { formatEur } from "@/lib/i18n/format";
import type { TranslationKey } from "@/lib/i18n";
import type { Settings, SortKey, SwipeDeckSort } from "@/lib/types";

// The same five orders the filter bar offers. Sharing the labels keeps the two
// dropdowns from drifting apart into two names for one sort order.
const SORT_OPTIONS: { value: SortKey; labelKey: TranslationKey }[] = [
  { value: "score", labelKey: "filters.sort.score" },
  { value: "newest", labelKey: "filters.sort.newest" },
  { value: "price_asc", labelKey: "filters.sort.priceAsc" },
  { value: "price_desc", labelKey: "filters.sort.priceDesc" },
  { value: "distance", labelKey: "filters.sort.distance" },
];

const DECK_SORT_OPTIONS: { value: SwipeDeckSort; labelKey: TranslationKey }[] = [
  { value: "score", labelKey: "settings.display.deck.options.score" },
  { value: "newest", labelKey: "settings.display.deck.options.newest" },
];

/** Small heading that bundles related fields inside a card. */
function FieldGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h3>
      {children}
    </div>
  );
}

/** Compact number field. With `off`, a 0 shows as an empty field with an "off" placeholder. */
function NumField({
  id,
  label,
  value,
  onChange,
  hint,
  off = false,
  min,
  max,
  step,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  off?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const t = useT();
  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min ?? 0}
          max={max}
          step={step}
          value={off ? value || "" : value}
          placeholder={off ? t("settings.off") : undefined}
          onChange={(e) => onChange(num(e.target.value))}
          className="h-9"
        />
        {suffix ? <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Switch row: the whole row is the touch target (min. 44px), not just the small switch. */
function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button[role="switch"]')) return;
        onChange(!checked);
      }}
    >
      <div>
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsForm({ initial, providers }: { initial: Settings; providers: string[] }) {
  const t = useT();
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const [geoPending, startGeo] = useTransition();
  const [showAdvancedScore, setShowAdvancedScore] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(
    initial.startLat && initial.startLng
      ? t("settings.origin.coordsSet", {
          lat: initial.startLat.toFixed(4),
          lng: initial.startLng.toFixed(4),
        })
      : null,
  );

  useEffect(() => {
    return () => {
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
    };
  }, []);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectedProviders = form.filterProviders
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const toggleProvider = (p: string) => {
    const set = new Set(selectedProviders);
    if (set.has(p)) set.delete(p);
    else set.add(p);
    update("filterProviders", Array.from(set).join(","));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      await saveSettingsAction(form);
      setSaved(true);
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setSaved(false), 2000);
    });
  };

  const geocode = () => {
    const addr = form.startAddress.trim();
    if (!addr) {
      toast.error(t("settings.origin.errors.empty"));
      return;
    }
    setGeoNote(null);
    startGeo(async () => {
      const res = await geocodeStartAction(addr);
      if (res.ok) {
        update("startLat", res.lat);
        update("startLng", res.lng);
        setGeoNote(
          t("settings.origin.coordsFound", {
            name: res.displayName,
            lat: res.lat.toFixed(4),
            lng: res.lng.toFixed(4),
          }),
        );
        toast.success(t("settings.origin.found"));
      } else {
        setGeoNote(null);
        toast.error(t("settings.origin.errors.notFound"));
      }
    });
  };

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <form onSubmit={submit} className="space-y-6 pb-4">
      {/* pb-* reserves as much room as the sticky save bar (plus the mobile tab bar)
          takes up, so it stops covering a form row once scrolling reaches the end. */}
      <Tabs
        defaultValue="scoring"
        className="w-full pb-[calc(var(--tab-h)+env(safe-area-inset-bottom)+80px)] md:pb-24"
      >
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="scoring">{t("settings.tabs.scoring")}</TabsTrigger>
          <TabsTrigger value="filters">{t("settings.tabs.filters")}</TabsTrigger>
          <TabsTrigger value="display">{t("settings.tabs.display")}</TabsTrigger>
        </TabsList>

        {/* ===================== Tab: Scoring ===================== */}
        <TabsContent value="scoring" className="mt-6 space-y-8">
          <p className="text-sm text-muted-foreground">{t("settings.scoring.intro")}</p>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.scoring.goals.title")}</CardTitle>
              <CardDescription>{t("settings.scoring.goals.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FieldGroup heading={t("settings.scoring.goals.household")}>
                <SwitchRow
                  id="sharedRoomMode"
                  label={t("settings.scoring.goals.sharedRoomMode.label")}
                  hint={t("settings.scoring.goals.sharedRoomMode.hint")}
                  checked={form.sharedRoomMode}
                  onChange={(v) => update("sharedRoomMode", v)}
                />
                <div className="space-y-2">
                  <Label htmlFor="voterCount">{t("settings.scoring.goals.voterCount")}</Label>
                  <Input
                    id="voterCount"
                    type="number"
                    min={1}
                    max={12}
                    className="h-11 w-24"
                    value={form.voterCount}
                    onChange={(e) =>
                      update("voterCount", Math.max(1, Math.floor(num(e.target.value))))
                    }
                  />
                </div>
              </FieldGroup>

              <FieldGroup heading={t("settings.scoring.goals.targets")}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.scoring.goals.budget")}</Label>
                    <span className="text-sm font-medium">
                      {formatEur(form.scoringMaxBudget, t.locale)}
                    </span>
                  </div>
                  <Slider
                    min={800}
                    max={6000}
                    step={50}
                    value={[form.scoringMaxBudget]}
                    onValueChange={(v) => update("scoringMaxBudget", v[0])}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.scoring.goals.distance")}</Label>
                    <span className="text-sm font-medium">
                      {form.scoringMaxDistanceKm} {t("common.units.km")}
                    </span>
                  </div>
                  <Slider
                    min={5}
                    max={100}
                    step={1}
                    value={[form.scoringMaxDistanceKm]}
                    onValueChange={(v) => update("scoringMaxDistanceKm", v[0])}
                  />
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> {t("settings.origin.title")}
              </CardTitle>
              <CardDescription>{t("settings.origin.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="startAddress">{t("settings.origin.address")}</Label>
              <div className="flex gap-2">
                <Input
                  id="startAddress"
                  placeholder={t("settings.origin.placeholder")}
                  className="h-11"
                  value={form.startAddress}
                  onChange={(e) => update("startAddress", e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-11"
                  onClick={geocode}
                  disabled={geoPending}
                >
                  <Search className="h-4 w-4" /> {geoPending ? "…" : t("settings.origin.lookup")}
                </Button>
              </div>
              {geoNote && <p className="text-xs text-muted-foreground">{geoNote}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.scoring.weights.title")}</CardTitle>
              <CardDescription>{t("settings.scoring.weights.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup heading={t("settings.scoring.weights.main")}>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <NumField
                    id="scoreWeightPrice"
                    label={t("settings.scoring.weights.price")}
                    value={form.scoreWeightPrice}
                    max={100}
                    onChange={(v) => update("scoreWeightPrice", v)}
                  />
                  <NumField
                    id="scoreWeightDistance"
                    label={t("settings.scoring.weights.distance")}
                    value={form.scoreWeightDistance}
                    max={100}
                    onChange={(v) => update("scoreWeightDistance", v)}
                  />
                  <NumField
                    id="scoreWeightRooms"
                    label={t("settings.scoring.weights.rooms")}
                    value={form.scoreWeightRooms}
                    max={100}
                    onChange={(v) => update("scoreWeightRooms", v)}
                  />
                  <NumField
                    id="scoreWeightSize"
                    label={t("settings.scoring.weights.size")}
                    value={form.scoreWeightSize}
                    max={100}
                    onChange={(v) => update("scoreWeightSize", v)}
                  />
                </div>
              </FieldGroup>

              <Separator />

              <Button
                type="button"
                variant="ghost"
                className="-ml-2 min-h-11 justify-start px-2"
                onClick={() => setShowAdvancedScore((s) => !s)}
                aria-expanded={showAdvancedScore}
              >
                {showAdvancedScore ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                {t("settings.scoring.advanced.toggle")}
              </Button>

              {showAdvancedScore ? (
                <div className="space-y-8">
                  <FieldGroup heading={t("settings.scoring.advanced.budgetTolerance.heading")}>
                    <NumField
                      id="scoreBudgetTolerancePct"
                      label={t("settings.scoring.advanced.budgetTolerance.label")}
                      hint={t("settings.scoring.advanced.budgetTolerance.hint")}
                      value={form.scoreBudgetTolerancePct}
                      max={200}
                      suffix="%"
                      onChange={(v) => update("scoreBudgetTolerancePct", v)}
                    />
                  </FieldGroup>

                  <FieldGroup heading={t("settings.scoring.advanced.roomTiers.heading")}>
                    <div className="grid grid-cols-3 gap-3">
                      <NumField
                        id="scoreRoomsIdealPct"
                        label={t("settings.scoring.advanced.roomTiers.ideal")}
                        value={form.scoreRoomsIdealPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreRoomsIdealPct", v)}
                      />
                      <NumField
                        id="scoreRoomsOkPct"
                        label={t("settings.scoring.advanced.roomTiers.ok")}
                        value={form.scoreRoomsOkPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreRoomsOkPct", v)}
                      />
                      <NumField
                        id="scoreRoomsTightPct"
                        label={t("settings.scoring.advanced.roomTiers.tight")}
                        value={form.scoreRoomsTightPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreRoomsTightPct", v)}
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup heading={t("settings.scoring.advanced.sqm.heading")}>
                    <div className="grid grid-cols-2 gap-3">
                      <NumField
                        id="scoreSqmGoodThreshold"
                        label={t("settings.scoring.advanced.sqm.goodThreshold")}
                        value={form.scoreSqmGoodThreshold}
                        min={1}
                        max={200}
                        onChange={(v) => update("scoreSqmGoodThreshold", v)}
                      />
                      <NumField
                        id="scoreSqmOkThreshold"
                        label={t("settings.scoring.advanced.sqm.okThreshold")}
                        value={form.scoreSqmOkThreshold}
                        min={1}
                        max={200}
                        onChange={(v) => update("scoreSqmOkThreshold", v)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <NumField
                        id="scoreSqmGoodPct"
                        label={t("settings.scoring.advanced.sqm.good")}
                        value={form.scoreSqmGoodPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreSqmGoodPct", v)}
                      />
                      <NumField
                        id="scoreSqmOkPct"
                        label={t("settings.scoring.advanced.sqm.ok")}
                        value={form.scoreSqmOkPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreSqmOkPct", v)}
                      />
                      <NumField
                        id="scoreSqmTightPct"
                        label={t("settings.scoring.advanced.sqm.tight")}
                        value={form.scoreSqmTightPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreSqmTightPct", v)}
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup heading={t("settings.scoring.advanced.special.heading")}>
                    <div className="grid grid-cols-2 gap-3">
                      <NumField
                        id="scoreNeutralPct"
                        label={t("settings.scoring.advanced.special.neutral.label")}
                        hint={t("settings.scoring.advanced.special.neutral.hint")}
                        value={form.scoreNeutralPct}
                        max={100}
                        suffix="%"
                        onChange={(v) => update("scoreNeutralPct", v)}
                      />
                      <NumField
                        id="scoreMaxPlausibleRooms"
                        label={t("settings.scoring.advanced.special.maxRooms.label")}
                        hint={t("settings.scoring.advanced.special.maxRooms.hint")}
                        value={form.scoreMaxPlausibleRooms}
                        min={1}
                        max={50}
                        onChange={(v) => update("scoreMaxPlausibleRooms", v)}
                      />
                    </div>
                    <SwitchRow
                      id="scoreSingleRoomFloor"
                      label={t("settings.scoring.advanced.special.singleRoomFloor.label")}
                      hint={t("settings.scoring.advanced.special.singleRoomFloor.hint")}
                      checked={form.scoreSingleRoomFloor}
                      onChange={(v) => update("scoreSingleRoomFloor", v)}
                    />
                  </FieldGroup>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== Tab: Filters ===================== */}
        <TabsContent value="filters" className="mt-6 space-y-8">
          <p className="text-sm text-muted-foreground">{t("settings.filters.intro")}</p>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.filters.hard.title")}</CardTitle>
              <CardDescription>{t("settings.filters.hard.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FieldGroup heading={t("settings.filters.hard.price")}>
                <div className="grid grid-cols-2 gap-4">
                  <NumField
                    id="filterMinPrice"
                    label={t("settings.filters.hard.minPrice")}
                    off
                    step={50}
                    value={form.filterMinPrice}
                    onChange={(v) => update("filterMinPrice", v)}
                  />
                  <NumField
                    id="filterMaxPrice"
                    label={t("settings.filters.hard.maxPrice")}
                    off
                    step={50}
                    value={form.filterMaxPrice}
                    onChange={(v) => update("filterMaxPrice", v)}
                  />
                </div>
              </FieldGroup>

              <FieldGroup heading={t("settings.filters.hard.roomsAndSize")}>
                <div className="grid grid-cols-2 gap-4">
                  <NumField
                    id="filterMinRooms"
                    label={t("settings.filters.hard.minRooms")}
                    off
                    max={20}
                    value={form.filterMinRooms}
                    onChange={(v) => update("filterMinRooms", v)}
                  />
                  <NumField
                    id="filterMaxRooms"
                    label={t("settings.filters.hard.maxRooms")}
                    off
                    max={20}
                    value={form.filterMaxRooms}
                    onChange={(v) => update("filterMaxRooms", v)}
                  />
                  <NumField
                    id="filterMinSize"
                    label={t("settings.filters.hard.minSize")}
                    off
                    max={1000}
                    value={form.filterMinSize}
                    onChange={(v) => update("filterMinSize", v)}
                  />
                  <NumField
                    id="filterMaxSize"
                    label={t("settings.filters.hard.maxSize")}
                    off
                    max={1000}
                    value={form.filterMaxSize}
                    onChange={(v) => update("filterMaxSize", v)}
                  />
                </div>
                <NumField
                  id="filterMinSqmPerPerson"
                  label={t("settings.filters.hard.minSqmPerPerson.label")}
                  hint={t("settings.filters.hard.minSqmPerPerson.hint")}
                  off
                  max={200}
                  value={form.filterMinSqmPerPerson}
                  onChange={(v) => update("filterMinSqmPerPerson", v)}
                />
              </FieldGroup>

              <FieldGroup heading={t("settings.filters.hard.ageAndDistance")}>
                <div className="grid grid-cols-2 gap-4">
                  <NumField
                    id="filterMaxAgeDays"
                    label={t("settings.filters.hard.maxAgeDays.label")}
                    hint={t("settings.filters.hard.maxAgeDays.hint")}
                    off
                    max={3650}
                    value={form.filterMaxAgeDays}
                    onChange={(v) => update("filterMaxAgeDays", v)}
                  />
                  <NumField
                    id="filterMaxDistanceKm"
                    label={t("settings.filters.hard.maxDistance")}
                    off
                    max={500}
                    value={form.filterMaxDistanceKm}
                    onChange={(v) => update("filterMaxDistanceKm", v)}
                  />
                </div>
              </FieldGroup>

              {providers.length > 0 && (
                <FieldGroup heading={t("settings.filters.hard.providers")}>
                  <div className="flex flex-wrap gap-2">
                    {providers.map((p) => {
                      const active = selectedProviders.includes(p.toLowerCase());
                      return (
                        <Button
                          key={p}
                          type="button"
                          className="min-h-11"
                          variant={active ? "default" : "outline"}
                          onClick={() => toggleProvider(p.toLowerCase())}
                        >
                          {providerLabel(p)}
                        </Button>
                      );
                    })}
                  </div>
                </FieldGroup>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.filters.keywords.title")}</CardTitle>
              <CardDescription>{t("settings.filters.keywords.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FieldGroup heading={t("settings.filters.keywords.exclude.heading")}>
                <div className="space-y-2">
                  <Label htmlFor="excludeKeywords">
                    {t("settings.filters.keywords.exclude.label")}
                  </Label>
                  <Input
                    id="excludeKeywords"
                    className="h-11"
                    placeholder={t("settings.filters.keywords.exclude.placeholder")}
                    value={form.excludeKeywords}
                    onChange={(e) => update("excludeKeywords", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.filters.keywords.exclude.hint")}
                  </p>
                </div>
                <SwitchRow
                  id="excludeKeywordsInAddress"
                  label={t("settings.filters.keywords.exclude.inAddress.label")}
                  hint={t("settings.filters.keywords.exclude.inAddress.hint")}
                  checked={form.excludeKeywordsInAddress}
                  onChange={(v) => update("excludeKeywordsInAddress", v)}
                />
                <div className="space-y-2">
                  <Label htmlFor="excludeAddressKeywords">
                    {t("settings.filters.keywords.exclude.addressLabel")}
                  </Label>
                  <Input
                    id="excludeAddressKeywords"
                    className="h-11"
                    placeholder={t("settings.filters.keywords.exclude.addressPlaceholder")}
                    value={form.excludeAddressKeywords}
                    onChange={(e) => update("excludeAddressKeywords", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.filters.keywords.exclude.addressHint")}
                  </p>
                </div>
              </FieldGroup>

              <FieldGroup heading={t("settings.filters.keywords.require.heading")}>
                <div className="space-y-2">
                  <Label htmlFor="requireKeywords">
                    {t("settings.filters.keywords.require.label")}
                  </Label>
                  <Input
                    id="requireKeywords"
                    className="h-11"
                    placeholder={t("settings.filters.keywords.require.placeholder")}
                    value={form.requireKeywords}
                    onChange={(e) => update("requireKeywords", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.filters.keywords.require.hint")}
                  </p>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.filters.singleRoom.title")}</CardTitle>
              <CardDescription>{t("settings.filters.singleRoom.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FieldGroup heading={t("settings.filters.singleRoom.detection")}>
                <SwitchRow
                  id="hideSingleRoom"
                  label={t("settings.filters.singleRoom.hideOneRoom.label")}
                  hint={t("settings.filters.singleRoom.hideOneRoom.hint")}
                  checked={form.hideSingleRoom}
                  onChange={(v) => update("hideSingleRoom", v)}
                />
                <SwitchRow
                  id="hideSingleRoomByTitle"
                  label={t("settings.filters.singleRoom.hideByTitle.label")}
                  hint={t("settings.filters.singleRoom.hideByTitle.hint")}
                  checked={form.hideSingleRoomByTitle}
                  onChange={(v) => update("hideSingleRoomByTitle", v)}
                />
              </FieldGroup>

              <FieldGroup heading={t("settings.filters.singleRoom.terms")}>
                <div className="space-y-2">
                  <Label htmlFor="singleRoomPatterns">
                    {t("settings.filters.singleRoom.patternsLabel")}
                  </Label>
                  <Textarea
                    id="singleRoomPatterns"
                    value={form.singleRoomPatterns}
                    onChange={(e) => update("singleRoomPatterns", e.target.value)}
                    className="min-h-[90px] font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.filters.singleRoom.patternsHint")}
                  </p>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.filters.unknown.title")}</CardTitle>
              <CardDescription>{t("settings.filters.unknown.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SwitchRow
                id="excludeUnknownPrice"
                label={t("settings.filters.unknown.price.label")}
                hint={t("settings.filters.unknown.price.hint")}
                checked={form.excludeUnknownPrice}
                onChange={(v) => update("excludeUnknownPrice", v)}
              />
              <SwitchRow
                id="excludeUnknownRooms"
                label={t("settings.filters.unknown.rooms.label")}
                hint={t("settings.filters.unknown.rooms.hint")}
                checked={form.excludeUnknownRooms}
                onChange={(v) => update("excludeUnknownRooms", v)}
              />
              <SwitchRow
                id="excludeUnknownSize"
                label={t("settings.filters.unknown.size.label")}
                hint={t("settings.filters.unknown.size.hint")}
                checked={form.excludeUnknownSize}
                onChange={(v) => update("excludeUnknownSize", v)}
              />
              <SwitchRow
                id="excludeUnknownDistance"
                label={t("settings.filters.unknown.distance.label")}
                hint={t("settings.filters.unknown.distance.hint")}
                checked={form.excludeUnknownDistance}
                onChange={(v) => update("excludeUnknownDistance", v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== Tab: Display ===================== */}
        <TabsContent value="display" className="mt-6 space-y-8">
          <p className="text-sm text-muted-foreground">{t("settings.display.intro")}</p>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.display.highlights.title")}</CardTitle>
              <CardDescription>{t("settings.display.highlights.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="highlightKeywords">{t("settings.display.highlights.label")}</Label>
                <Input
                  id="highlightKeywords"
                  className="h-11"
                  placeholder={t("settings.display.highlights.placeholder")}
                  value={form.highlightKeywords}
                  onChange={(e) => update("highlightKeywords", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.display.highlights.hint")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.display.thresholds.title")}</CardTitle>
              <CardDescription>{t("settings.display.thresholds.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FieldGroup heading={t("settings.display.thresholds.heading")}>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <NumField
                    id="displayGoodScore"
                    label={t("settings.display.thresholds.good")}
                    min={1}
                    max={5}
                    value={form.displayGoodScore}
                    onChange={(v) => update("displayGoodScore", v)}
                  />
                  <NumField
                    id="displayWeakScore"
                    label={t("settings.display.thresholds.weak")}
                    min={0}
                    max={5}
                    value={form.displayWeakScore}
                    onChange={(v) => update("displayWeakScore", v)}
                  />
                  <NumField
                    id="displayDashboardTopN"
                    label={t("settings.display.thresholds.dashboardTopN")}
                    min={1}
                    max={24}
                    value={form.displayDashboardTopN}
                    onChange={(v) => update("displayDashboardTopN", v)}
                  />
                </div>
              </FieldGroup>

              <FieldGroup heading={t("settings.display.sort.heading")}>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("settings.display.sort.label")}</Label>
                  <Select
                    value={form.defaultSort}
                    onValueChange={(v) => update("defaultSort", v as SortKey)}
                  >
                    <SelectTrigger className="h-11 w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {t(o.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.display.deck.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <FieldGroup heading={t("settings.display.deck.heading")}>
                <div className="grid grid-cols-2 gap-4">
                  <NumField
                    id="swipeDeckSize"
                    label={t("settings.display.deck.size")}
                    min={1}
                    max={500}
                    value={form.swipeDeckSize}
                    onChange={(v) => update("swipeDeckSize", v)}
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("settings.display.deck.order")}</Label>
                    <Select
                      value={form.swipeDeckSort}
                      onValueChange={(v) => update("swipeDeckSort", v as SwipeDeckSort)}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DECK_SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FieldGroup>

              <FieldGroup heading={t("settings.display.data.heading")}>
                <NumField
                  id="loadLimit"
                  label={t("settings.display.data.loadLimit.label")}
                  hint={t("settings.display.data.loadLimit.hint")}
                  min={100}
                  max={10000}
                  step={100}
                  value={form.loadLimit}
                  onChange={(v) => update("loadLimit", v)}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+12px)] z-30 flex items-center justify-end gap-3 rounded-lg border bg-card/90 p-2 shadow-card backdrop-blur md:bottom-4">
        {saved ? (
          <span role="status" className="text-sm font-medium text-score-good">
            {t("common.saved")}
          </span>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 w-full shadow-lg sm:w-auto"
        >
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
