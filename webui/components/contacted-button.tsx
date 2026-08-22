"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Mail } from "lucide-react";
import { setContactedAction } from "@/app/actions";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Toggle for the "contacted" marker. Flips optimistically and rolls the change back
 *  if the server could not store it. Kept in its own component so every surface that
 *  shows a listing — card, swipe deck, detail page — gets the same behaviour. */
export function ContactedButton({
  listingId,
  contactedAt,
  contactedLabel,
  className,
  buttonClassName,
}: {
  listingId: string;
  /** Server state: when contact was made, or null. */
  contactedAt: number | null;
  /** Optional note under the button, e.g. "contacted on 1 Aug 2026". */
  contactedLabel?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useT();
  const serverContacted = contactedAt != null;
  const [contacted, setContacted] = useState(serverContacted);
  const [synced, setSynced] = useState(serverContacted);
  const [pending, start] = useTransition();

  // Server state wins as soon as it changes (after revalidatePath).
  if (serverContacted !== synced) {
    setSynced(serverContacted);
    setContacted(serverContacted);
  }

  function toggle() {
    const next = !contacted;
    setContacted(next);
    start(async () => {
      try {
        const res = await setContactedAction(listingId, next);
        if (!res?.ok) throw new Error("not ok");
      } catch {
        setContacted(!next);
        toast.error(t("common.errors.saveFailed"));
      }
    });
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={contacted}
        title={contacted ? t("listings.contact.unmark") : t("listings.contact.mark")}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-60",
          contacted
            ? "bg-score-good text-score-good-foreground hover:bg-score-good/90"
            : "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          buttonClassName,
        )}
      >
        {contacted ? <Check className="size-4 shrink-0" /> : <Mail className="size-4 shrink-0" />}
        {contacted ? t("listings.contact.done") : t("listings.contact.ask")}
      </button>
      {contacted && contactedLabel ? (
        <span className="text-xs text-muted-foreground">{contactedLabel}</span>
      ) : null}
    </div>
  );
}
