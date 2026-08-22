"use client";

import { Star } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function StarRating({ score, className }: { score: number; className?: string }) {
  const t = useT();
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={t("score.stars", { count: score })}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i <= score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
