"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { PROVIDER_LABELS } from "@/lib/providers";

const SORT_OPTIONS = [
  { value: "score", labelKey: "filters.sort.score" },
  { value: "newest", labelKey: "filters.sort.newest" },
  { value: "price_asc", labelKey: "filters.sort.priceAsc" },
  { value: "price_desc", labelKey: "filters.sort.priceDesc" },
  { value: "distance", labelKey: "filters.sort.distance" },
] as const;

type State = {
  q: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  maxDist: string;
  minScore: string;
  providers: string[];
  sort: string;
  hi: boolean;
  all: boolean;
};

function stateFromParams(sp: URLSearchParams, defaultSort: string): State {
  return {
    q: sp.get("q") ?? "",
    minPrice: sp.get("minPrice") ?? "",
    maxPrice: sp.get("maxPrice") ?? "",
    minRooms: sp.get("minRooms") ?? "",
    maxRooms: sp.get("maxRooms") ?? "",
    maxDist: sp.get("maxDist") ?? "",
    minScore: sp.get("minScore") ?? "",
    providers: (sp.get("providers") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    sort: sp.get("sort") ?? defaultSort,
    hi: sp.get("hi") === "1",
    all: sp.get("all") === "1",
  };
}

/** Same URL parameters as before; `tab` (listings page) is carried through untouched. */
function buildParams(s: State, defaultSort: string, tab: string | null): string {
  const p = new URLSearchParams();
  if (tab) p.set("tab", tab);
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.minPrice) p.set("minPrice", s.minPrice);
  if (s.maxPrice) p.set("maxPrice", s.maxPrice);
  if (s.minRooms) p.set("minRooms", s.minRooms);
  if (s.maxRooms) p.set("maxRooms", s.maxRooms);
  if (s.maxDist) p.set("maxDist", s.maxDist);
  if (s.minScore) p.set("minScore", s.minScore);
  if (s.providers.length) p.set("providers", s.providers.join(","));
  if (s.sort && s.sort !== defaultSort) p.set("sort", s.sort);
  if (s.hi) p.set("hi", "1");
  if (s.all) p.set("all", "1");
  return p.toString();
}

function activeCount(s: State): number {
  let n = 0;
  for (const k of ["minPrice", "maxPrice", "minRooms", "maxRooms", "maxDist", "minScore"] as const)
    if (s[k]) n++;
  if (s.providers.length) n++;
  if (s.hi) n++;
  if (s.all) n++;
  return n;
}

export function ListingFilterBar({
  providers,
  showAllToggle = true,
  defaultSort = "score",
}: {
  providers: string[];
  showAllToggle?: boolean;
  defaultSort?: string;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false); // desktop panel
  const [sheetOpen, setSheetOpen] = useState(false); // mobile bottom sheet
  const [state, setState] = useState<State>(() => stateFromParams(searchParams, defaultSort));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if the URL changes externally (back/forward, back link).
  const paramsKey = searchParams.toString();
  const [syncedKey, setSyncedKey] = useState(paramsKey);
  if (paramsKey !== syncedKey) {
    setSyncedKey(paramsKey);
    setState(stateFromParams(searchParams, defaultSort));
  }

  const push = (next: State, debounce = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const go = () => {
      const qs = buildParams(next, defaultSort, searchParams.get("tab"));
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    };
    if (debounce) debounceRef.current = setTimeout(go, 350);
    else go();
  };

  const set = <K extends keyof State>(k: K, v: State[K], debounce = false) => {
    const next = { ...state, [k]: v };
    setState(next);
    push(next, debounce);
  };

  const toggleProvider = (p: string) => {
    const has = state.providers.includes(p);
    const providersNext = has ? state.providers.filter((x) => x !== p) : [...state.providers, p];
    set("providers", providersNext);
  };

  const reset = () => {
    const cleared: State = {
      q: "",
      minPrice: "",
      maxPrice: "",
      minRooms: "",
      maxRooms: "",
      maxDist: "",
      minScore: "",
      providers: [],
      sort: defaultSort,
      hi: false,
      all: false,
    };
    setState(cleared);
    push(cleared);
  };

  const count = activeCount(state);
  const title = count > 0 ? t("filters.titleWithCount", { count }) : t("filters.title");

  const controls = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <NumField label={t("filters.price.min")} value={state.minPrice} onChange={(v) => set("minPrice", v, true)} />
        <NumField label={t("filters.price.max")} value={state.maxPrice} onChange={(v) => set("maxPrice", v, true)} />
        <NumField label={t("filters.rooms.min")} value={state.minRooms} onChange={(v) => set("minRooms", v, true)} />
        <NumField label={t("filters.rooms.max")} value={state.maxRooms} onChange={(v) => set("maxRooms", v, true)} />
        <NumField label={t("filters.maxDistance")} value={state.maxDist} onChange={(v) => set("maxDist", v, true)} />
        <NumField
          label={t("filters.minScore")}
          value={state.minScore}
          onChange={(v) => set("minScore", v, true)}
        />
      </div>

      {providers.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs">{t("filters.provider")}</Label>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => {
              const key = p.toLowerCase();
              const active = state.providers.some((x) => x.toLowerCase() === key);
              return (
                <Button
                  key={p}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="h-11"
                  onClick={() => toggleProvider(key)}
                >
                  {/* Raw value first: `wgGesucht` is camelCase in the database. */}
                  {PROVIDER_LABELS[p] ?? PROVIDER_LABELS[key] ?? p}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">{t("filters.sort.label")}</Label>
          <Select value={state.sort} onValueChange={(v) => set("sort", v)}>
            <SelectTrigger className="h-11 w-44">
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Switch checked={state.hi} onCheckedChange={(v) => set("hi", v)} />
          {t("filters.highlightsOnly")}
        </label>
        {showAllToggle ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Switch checked={state.all} onCheckedChange={(v) => set("all", v)} />
            <span>
              {t("filters.showDeleted.label")}
              <span className="block text-xs text-muted-foreground">
                {t("filters.showDeleted.hint")}
              </span>
            </span>
          </label>
        ) : null}
        <Button type="button" variant="ghost" onClick={reset} className="ml-auto h-11">
          <X className="size-4" /> {t("common.reset")}
        </Button>
      </div>
      {pending ? <p className="text-xs text-muted-foreground">{t("filters.updating")}</p> : null}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.q}
            onChange={(e) => set("q", e.target.value, true)}
            // short placeholder so it is not cut off mid-word on narrow displays —
            // the full text lives in the aria-label
            placeholder={t("filters.searchPlaceholder")}
            aria-label={t("filters.searchLabel")}
            className="h-11 pl-9"
          />
        </div>
        {/* mobile: one button, opens the bottom sheet */}
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 md:hidden"
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          {title}
        </Button>
        {/* desktop: toggles the inline panel */}
        <Button
          type="button"
          variant={open ? "default" : "outline"}
          className="hidden h-11 md:inline-flex"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <SlidersHorizontal className="size-4" />
          {t("filters.title")}
          {count > 0 ? (
            <span className="ml-1 rounded-full bg-brand px-1.5 text-xs text-brand-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </div>

      {/* desktop panel */}
      {open ? (
        <div className="hidden rounded-lg border bg-card p-4 md:block">{controls}</div>
      ) : null}

      {/* mobile sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0 md:hidden"
        >
          <SheetHeader className="shrink-0 px-4 pb-3 pr-12 pt-4 text-left">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {/* only the content scrolls — the footer stays visible */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{controls}</div>
          <div
            className="shrink-0 border-t bg-background px-4 py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Button type="button" className="h-11 w-full" onClick={() => setSheetOpen(false)}>
              {t("filters.apply")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        placeholder={t("filters.anyValue")}
        onChange={(e) => onChange(e.target.value)}
        className="h-11"
      />
    </div>
  );
}
