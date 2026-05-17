import Link from "next/link";
import { GENRES } from "@/lib/constants";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-4 pt-8 pb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-50 sm:text-6xl">
          <span className="text-violet-400">Log</span> the games you&apos;ve played.{" "}
          <span className="text-violet-400">Rank</span> them with everyone else.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-neutral-400">
          NextQuest is a community-ranked leaderboard for video games. Log a game, give it a rating,
          vote on others — climb the top 20 in every genre.
        </p>
        <div className="flex justify-center gap-3 pt-4">
          <Link
            href="/signup"
            className="rounded-md bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-500"
          >
            Get started
          </Link>
          <Link
            href="/leaderboards"
            className="rounded-md border border-neutral-700 px-5 py-2.5 font-medium text-neutral-100 hover:bg-neutral-900"
          >
            Browse leaderboards
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Genres</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GENRES.map((g) => (
            <Link key={g} href={`/leaderboards/${encodeURIComponent(g)}`}>
              <Card className="hover:border-violet-500 hover:bg-neutral-900">
                <span className="font-medium">{g}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
