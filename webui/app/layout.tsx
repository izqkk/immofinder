import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import "./globals.css";

/** Title and description follow the visitor's language, like the rest of the shell. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("common.appName"),
    description: t("nav.tagline"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#14171c" },
  ],
};

/** Chrome-free shell. Navigation and the status bar live in the gated
 *  `(app)` layout — the login page must not show either. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <I18nProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
