import Link from "next/link";
import { GENRES } from "@/lib/constants";
import { Card } from "@/components/ui/card";

export default function LeaderboardsIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboards</h1>
        <p className="text-sm text-neutral-400">Top 20 games per genre, ranked by net votes.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GENRES.map((g) => (
          <Link key={g} href={`/leaderboards/${encodeURIComponent(g)}`}>
            <Card className="hover:border-violet-500 hover:bg-neutral-900">
              <span className="font-medium">{g}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
