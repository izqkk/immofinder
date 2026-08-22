"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setListingStatusAction } from "@/app/actions";
import { useT } from "@/lib/i18n/client";

export function RestoreButton({ listingId }: { listingId: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setListingStatusAction(listingId, "unseen");
        })
      }
      className="shadow"
    >
      <Undo2 /> {t("listings.actions.unDiscard")}
    </Button>
  );
}
