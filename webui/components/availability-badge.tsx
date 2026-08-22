"use client";

import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { relativeAge } from "@/lib/i18n/format";
import type { Availability } from "@/lib/types";

const CONFIG = {
  available: {
    icon: CheckCircle2,
    labelKey: "availability.available",
    cls: "text-green-600 border-green-600/30 bg-green-600/5",
  },
  gone: {
    icon: XCircle,
    labelKey: "availability.gone",
    cls: "text-red-600 border-red-600/40 bg-red-600/5",
  },
  error: {
    icon: HelpCircle,
    labelKey: "availability.error",
    cls: "text-muted-foreground border-border bg-muted/40",
  },
} as const;

export function AvailabilityBadge({ availability }: { availability: Availability | null }) {
  const t = useT();
  if (!availability) return null;
  const { icon: Icon, labelKey, cls } = CONFIG[availability.status];
  const checked = t("availability.checked", { age: relativeAge(availability.checkedAt, t) });
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${cls}`}
      title={availability.detail ? `${checked} · ${availability.detail}` : checked}
    >
      <Icon className="size-3" /> {t(labelKey)}
    </span>
  );
}
