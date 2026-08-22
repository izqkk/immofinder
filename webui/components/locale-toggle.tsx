"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/app/locale-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * Language switcher.
 *
 * The choice lives in a cookie that the server reads, so the whole tree — including
 * server-rendered pages — has to re-render afterwards: `router.refresh()` does that
 * without losing scroll position or client state.
 */
export function LocaleToggle() {
  const t = useT();
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function choose(locale: Locale) {
    if (locale === active) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language")} disabled={pending}>
          <Languages className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => choose(locale)}
            aria-current={locale === active ? "true" : undefined}
            className={locale === active ? "font-medium" : undefined}
          >
            {LOCALE_NAMES[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
