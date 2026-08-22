"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, List, MoreHorizontal, Radar, Search, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { TranslationKey } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  /** Dictionary key for the full label (desktop bar). */
  labelKey: TranslationKey;
  /** Dictionary key for the short label (mobile tab bar). */
  shortKey: TranslationKey;
  icon: LucideIcon;
  /** additional routes that mark this item as active */
  matches?: string[];
};

/** Bottom tab bar (mobile) — five destinations. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.items.home", shortKey: "nav.items.homeShort", icon: Home },
  { href: "/swipe", labelKey: "nav.items.swipe", shortKey: "nav.items.swipeShort", icon: Layers },
  {
    href: "/listings",
    labelKey: "nav.items.listings",
    shortKey: "nav.items.listingsShort",
    icon: List,
  },
  { href: "/search", labelKey: "nav.items.search", shortKey: "nav.items.searchShort", icon: Search },
  {
    href: "/more",
    labelKey: "nav.items.more",
    shortKey: "nav.items.moreShort",
    icon: MoreHorizontal,
    matches: ["/scrape", "/settings"],
  },
];

/** Extra destinations that only the desktop bar shows directly. */
export const DESKTOP_EXTRA_ITEMS: NavItem[] = [
  { href: "/scrape", labelKey: "nav.items.scrape", shortKey: "nav.items.scrapeShort", icon: Radar },
  {
    href: "/settings",
    labelKey: "nav.items.settings",
    shortKey: "nav.items.settingsShort",
    icon: Settings,
  },
];

const DESKTOP_ITEMS: NavItem[] = [
  ...NAV_ITEMS.filter((it) => it.href !== "/more"),
  ...DESKTOP_EXTRA_ITEMS,
];

function matchesRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: NavItem) {
  return (
    matchesRoute(pathname, item.href) ||
    (item.matches ?? []).some((href) => matchesRoute(pathname, href))
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <>
      {/* Top bar (word mark, desktop nav, language and theme toggles) */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div
          className="container mx-auto flex items-center gap-6 px-4"
          style={{ height: "var(--nav-h)" }}
        >
          <Link href="/" className="font-semibold tracking-tight">
            {t("common.appName")}
          </Link>
          <nav className="hidden gap-1 text-sm md:flex">
            {DESKTOP_ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                aria-current={isActive(pathname, it) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  isActive(pathname, it)
                    ? "bg-brand-soft font-medium text-brand-soft-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t(it.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Bottom tab bar (mobile only) */}
      <nav
        aria-label={t("nav.primaryLabel")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid h-16 grid-cols-5">
          {NAV_ITEMS.map((it) => {
            const active = isActive(pathname, it);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active ? "font-medium text-accent-amber-strong" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent-amber-strong"
                  />
                ) : null}
                <Icon className="size-5" />
                <span>{t(it.shortKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
