import { getSettings } from "@/lib/settings";
import { getAvailableProviders } from "@/lib/listings";
import { SettingsForm } from "./settings-form";
import { requirePageSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePageSession();
  const t = await getT();
  const settings = getSettings();
  const providers = getAvailableProviders();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>
      <SettingsForm initial={settings} providers={providers} />
    </div>
  );
}
