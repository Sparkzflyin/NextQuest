import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { profiles, userCurrentlyPlaying, reviews, games } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

// Public profile. Read-only view of any user's username, avatar, currently
// playing list, and approved reviews. RLS already restricts the underlying
// tables (reviews public-select only on approved, currently_playing read-all,
// profiles read-all), so we can pull this without any auth check.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, decoded));
  if (!profile) notFound();

  const currentlyPlaying = await db
    .select({
      gameId: games.id,
      title: games.title,
      coverUrl: games.coverUrl,
      startedAt: userCurrentlyPlaying.startedAt,
    })
    .from(userCurrentlyPlaying)
    .innerJoin(games, eq(games.id, userCurrentlyPlaying.gameId))
    .where(eq(userCurrentlyPlaying.userId, profile.id))
    .orderBy(desc(userCurrentlyPlaying.startedAt));

  const userReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
      gameId: games.id,
      gameTitle: games.title,
      gameCover: games.coverUrl,
    })
    .from(reviews)
    .innerJoin(games, eq(games.id, reviews.gameId))
    .where(and(eq(reviews.userId, profile.id), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <header className="flex items-center gap-4">
        <Avatar avatarUrl={profile.avatarUrl} username={profile.username} size={80} />
        <div>
          <h1 className="text-2xl font-semibold">{profile.username}</h1>
          <p className="text-xs text-neutral-500">
            joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Currently playing</h2>
        {currentlyPlaying.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing on their active quest log.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {currentlyPlaying.map((item) => (
              <li
                key={item.gameId}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3"
              >
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="h-12 w-16 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-16 flex-shrink-0 rounded bg-neutral-800" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/games/${item.gameId}`}
                    className="truncate font-medium text-violet-100 hover:text-neon-cyan"
                  >
                    {item.title}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    started {new Date(item.startedAt).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Logs{" "}
          <span className="text-sm font-normal text-neutral-500">({userReviews.length})</span>
        </h2>
        {userReviews.length === 0 ? (
          <p className="text-sm text-neutral-500">No published logs yet.</p>
        ) : (
          <ul className="space-y-2">
            {userReviews.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/games/${r.gameId}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 hover:border-violet-500"
                >
                  {r.gameCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.gameCover}
                      alt=""
                      className="h-12 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-16 rounded bg-neutral-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.gameTitle}</div>
                    <div className="truncate text-xs text-neutral-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                      {r.body && (
                        <>
                          {" "}
                          ·{" "}
                          {r.body.slice(0, 80)}
                          {r.body.length > 80 ? "…" : ""}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-sm text-violet-300">{r.rating}/10</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Inline avatar primitive — kept here (rather than a shared component) until a
// second consumer shows up, then promote. Fallback is the first letter of the
// username in the pixel font, which matches the brand vibe.
function Avatar({
  avatarUrl,
  username,
  size,
}: {
  avatarUrl: string | null;
  username: string;
  size: number;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-violet-800/60 bg-neutral-900"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="font-pixel flex h-full w-full items-center justify-center text-violet-300/70"
          style={{ fontSize: Math.floor(size / 2.5) }}
        >
          {username.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}
