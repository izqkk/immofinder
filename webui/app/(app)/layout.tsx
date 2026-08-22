import { BackgroundStatusBar } from "@/components/background-status-bar";
import { SiteNav } from "@/components/site-nav";
import { requirePageSession } from "@/lib/session";

/**
 * Everything behind the password gate. The session check here is a second line of
 * defence behind `proxy.ts`; each page repeats it, because a layout may be reused
 * from the client router cache and must never be the only guard.
 *
 * Nothing in here may be prerendered: a page without its own data access (e.g.
 * `/more`) would otherwise be rendered once at build time — without a session —
 * and Next would cache the resulting redirect to `/login` and serve it to logged-in
 * visitors as well (observed as `x-nextjs-cache: HIT` on a 307).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePageSession();

  return (
    <>
      <SiteNav />
      <BackgroundStatusBar />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
    </>
  );
}
