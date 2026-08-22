"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteListingAction, restoreDeletedAction } from "@/app/actions";
import { useT } from "@/lib/i18n/client";

/** Description clamped to six lines with a "show more" toggle. */
export function ExpandableDescription({ text }: { text: string }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">{t("listings.detail.description")}</h2>
      <p
        className={`whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground ${
          expanded ? "" : "line-clamp-6"
        }`}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex h-11 items-center text-sm font-medium text-brand hover:underline"
      >
        {expanded ? t("common.less") : t("common.more")}
      </button>
    </div>
  );
}

export function DetailActions({ listingId, deleted }: { listingId: string; deleted: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const router = useRouter();

  if (deleted) {
    return (
      <Button
        className="w-full"
        variant="secondary"
        disabled={pending}
        onClick={() => start(async () => {
          await restoreDeletedAction([listingId]);
          router.refresh();
        })}
      >
        <RotateCcw /> {t("common.restore")}
      </Button>
    );
  }

  return (
    <Button
      className="w-full text-red-600 hover:text-red-700"
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => {
        await deleteListingAction(listingId);
        router.push("/listings");
      })}
    >
      <Trash2 /> {t("listings.detail.delete")}
    </Button>
  );
}
