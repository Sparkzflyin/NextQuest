import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { canonicalGenres } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";

export default async function LeaderboardsIndex() {
  const rows = await db
    .select({ name: canonicalGenres.name })
    .from(canonicalGenres)
    .orderBy(asc(canonicalGenres.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboards</h1>
        <p className="text-sm text-neutral-400">Top 20 games per genre, ranked by net votes.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((g) => (
          <Link key={g.name} href={`/leaderboards/${encodeURIComponent(g.name)}`}>
            <Card className="hover:border-violet-500 hover:bg-neutral-900">
              <span className="font-medium">{g.name}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
