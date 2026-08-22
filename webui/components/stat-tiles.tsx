import Link from "next/link";

// The dashboard's stat tiles: big number, small label, the whole tile is a link.
// 2×2 on mobile, a single row from md up.

export type Tile = { label: string; value: string; href: string };

export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="flex min-h-24 flex-col justify-between rounded-lg bg-surface-raised p-4 shadow-card transition-colors hover:bg-brand-soft"
        >
          <span className="text-2xl font-semibold tabular-nums sm:text-3xl">{t.value}</span>
          <span className="mt-1 text-xs text-muted-foreground">{t.label}</span>
        </Link>
      ))}
    </div>
  );
}
