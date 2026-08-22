"use client";

// Narrow band under the navigation: shows background work in progress (scrape,
// availability check) and the notice a run leaves behind. Polls itself — every 3 s
// while something runs or a notice is pending, otherwise every 30 s. Renders nothing
// when idle.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { getBackgroundStatusAction, type BackgroundStatus } from "@/app/actions";
import { useT } from "@/lib/i18n/client";
import type { TFunction } from "@/lib/i18n";

const BUSY_POLL_MS = 3_000;
const IDLE_POLL_MS = 30_000;
const NOTICE_MS = 60_000;

type Notice = { text: string; until: number };

function scrapeNotice(newListings: number, t: TFunction): string {
  if (newListings <= 0) return t("status.done.scrape.none");
  return t.plural("status.done.scrape.found", newListings);
}

function availabilityNotice(gone: number, t: TFunction): string {
  if (gone <= 0) return t("status.done.availability.none");
  return t.plural("status.done.availability.gone", gone);
}

function geocodeNotice(resolved: number, t: TFunction): string {
  if (resolved <= 0) return t("status.done.geocode.none");
  return t.plural("status.done.geocode.resolved", resolved);
}

export function BackgroundStatusBar() {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState<BackgroundStatus | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<Notice | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const prevRef = useRef<{ scrape: boolean; availability: boolean; geocode: boolean } | null>(null);

  const putNotice = useCallback((text: string) => {
    const next = { text, until: Date.now() + NOTICE_MS };
    noticeRef.current = next;
    setNotice(next);
  }, []);

  const clearNotice = useCallback(() => {
    noticeRef.current = null;
    setNotice(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      let next: BackgroundStatus | null = null;
      try {
        next = await getBackgroundStatusAction();
      } catch {
        next = null;
      }
      if (cancelled) return;

      if (next) {
        setStatus(next);
        const before = prevRef.current;
        if (before?.scrape && !next.scrape.running) {
          putNotice(scrapeNotice(next.scrape.newListings, t));
        } else if (before?.availability && !next.availability.running) {
          putNotice(availabilityNotice(next.availability.gone, t));
        } else if (before?.geocode && !next.geocode.running) {
          putNotice(geocodeNotice(next.geocode.resolved, t));
        }
        prevRef.current = {
          scrape: next.scrape.running,
          availability: next.availability.running,
          geocode: next.geocode.running,
        };
      }

      if (noticeRef.current && noticeRef.current.until <= Date.now()) clearNotice();

      const busy = Boolean(
        next?.scrape.running || next?.availability.running || next?.geocode.running,
      );
      timer = setTimeout(tick, busy || noticeRef.current ? BUSY_POLL_MS : IDLE_POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [putNotice, clearNotice, t]);

  // Hide the notice after 60 s at the latest, even without a further poll.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, Math.max(0, notice.until - Date.now()));
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

  const scrape = status?.scrape;
  const availability = status?.availability;
  const geocode = status?.geocode;

  let label: string | null = null;
  let progress: number | null = null;
  let showRefresh = false;

  if (scrape?.running) {
    label =
      scrape.jobs > 0
        ? t.plural("status.scrape.running", scrape.jobs)
        : t("status.scrape.starting");
  } else if (availability?.running) {
    const { done, total } = availability;
    label =
      total > 0
        ? t("status.availability.progress", { done, total })
        : t("status.availability.running");
    progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  } else if (geocode?.running) {
    const { done, total } = geocode;
    label =
      total > 0 ? t("status.geocode.progress", { done, total }) : t("status.geocode.running");
    progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  } else if (notice) {
    label = notice.text;
    showRefresh = true;
  }

  // The band publishes its height as `--status-h` so layouts that compute a full
  // viewport height (the swipe stack, for instance) can subtract it. When idle the
  // band renders nothing — the height is 0px then.
  useEffect(() => {
    const root = document.documentElement;
    const el = barRef.current;
    if (!el) {
      root.style.setProperty("--status-h", "0px");
      return;
    }
    const apply = () => {
      root.style.setProperty("--status-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--status-h", "0px");
    };
  }, [label]);

  if (!label) return null;

  return (
    <div
      ref={barRef}
      role="status"
      aria-live="polite"
      className="sticky z-20 border-b border-brand-soft bg-brand-soft text-brand-soft-foreground"
      style={{ top: "var(--nav-h)" }}
    >
      <div className="container mx-auto flex min-h-9 items-center gap-3 px-4 py-1.5 text-sm">
        <span className="truncate">{label}</span>
        {showRefresh ? (
          <button
            type="button"
            onClick={() => {
              clearNotice();
              router.refresh();
            }}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-medium underline-offset-2 hover:underline"
          >
            <RefreshCw className="size-4" aria-hidden />
            {t("common.refresh")}
          </button>
        ) : null}
      </div>
      <div className="h-0.5 w-full overflow-hidden bg-brand/15" aria-hidden>
        {progress === null ? (
          showRefresh ? null : <div className="h-full w-full animate-pulse bg-brand" />
        ) : (
          <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
        )}
      </div>
    </div>
  );
}
