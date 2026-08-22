"use client";

// Kicks off a scrape run without blocking anything: the spinner only turns while the
// call is in flight — progress itself is shown by the global status bar
// (components/background-status-bar.tsx).

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerScrapeAction } from "@/app/actions";
import { useT } from "@/lib/i18n/client";

export function ScrapeButton({
  size = "default",
  variant = "outline",
}: {
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const t = useT();
  const [inFlight, setInFlight] = useState(false);

  async function run() {
    setInFlight(true);
    try {
      const r = await triggerScrapeAction();
      if (r.ok) {
        toast.success(t("scrape.trigger.started"));
      } else if (r.reason === "already_running") {
        toast.info(t("scrape.trigger.alreadyRunning"));
      } else if (r.reason === "not_configured") {
        toast.error(t("scrape.trigger.notConfigured.title"), {
          description: t("scrape.trigger.notConfigured.description"),
        });
      } else if (r.reason === "auth_failed") {
        toast.error(t("scrape.trigger.authFailed"), { description: r.detail });
      } else {
        toast.error(t("scrape.trigger.failed"), { description: r.detail });
      }
    } catch (err) {
      toast.error(t("scrape.trigger.failed"), { description: String(err) });
    } finally {
      setInFlight(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={run}
      size={size}
      variant={variant}
      className={size === "lg" ? "h-12" : "h-11"}
    >
      {inFlight ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {t("scrape.trigger.label")}
    </Button>
  );
}
