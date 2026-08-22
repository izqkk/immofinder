"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** No store to subscribe to — the value never changes after hydration. */
const neverChanges = () => () => {};

/**
 * `false` on the server and during the first client render, `true` afterwards.
 *
 * The theme is only known once `next-themes` has read the browser, so the icon has to
 * be decided after hydration. `useSyncExternalStore` gives the server render and the
 * first client render the same answer, which is exactly what avoids a mismatch —
 * a `useState` + `useEffect` pair would set state during the effect instead.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11"
      aria-label={t("common.theme.toggle")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
