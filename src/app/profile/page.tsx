import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  profiles,
  userGenres,
  userPlaystyles,
  userExcludedGenres,
  userExcludedTags,
  userCurrentlyPlaying,
  canonicalGenres,
  canonicalPlaystyles,
  reviews,
  games,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { getCreditsForUser, trustTier } from "@/lib/credits";
import { ProfileForm } from "./profile-form";
import { CurrentlyPlayingSection } from "./currently-playing-section";
import { AccountSecuritySection } from "./account-security-section";
import { AvatarUpload } from "./avatar-upload";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  const pickedGenres = await db.select().from(userGenres).where(eq(userGenres.userId, user.id));
  const pickedPlaystyles = await db
    .select()
    .from(userPlaystyles)
    .where(eq(userPlaystyles.userId, user.id));
  const excludedGenres = await db
    .select()
    .from(userExcludedGenres)
    .where(eq(userExcludedGenres.userId, user.id));
  const excludedTags = await db
    .select()
    .from(userExcludedTags)
    .where(eq(userExcludedTags.userId, user.id));
  const allGenres = await db
    .select({ name: canonicalGenres.name })
    .from(canonicalGenres)
    .orderBy(asc(canonicalGenres.name));
  const allPlaystyles = await db
    .select({ name: canonicalPlaystyles.name })
    .from(canonicalPlaystyles)
    .orderBy(asc(canonicalPlaystyles.name));
  const myReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      status: reviews.status,
      createdAt: reviews.createdAt,
      gameId: games.id,
      gameTitle: games.title,
      gameCover: games.coverUrl,
    })
    .from(reviews)
    .innerJoin(games, eq(games.id, reviews.gameId))
    .where(eq(reviews.userId, user.id))
    .orderBy(desc(reviews.createdAt))
    .limit(50);

  // "Top liked": approved reviews where this user scored the game ≥ 8.
  // Matches the "loved" threshold the recommendations algorithm uses, so the
  // list explains *why* their FYP looks the way it does.
  const topLiked = await db
    .select({
      gameId: games.id,
      title: games.title,
      coverUrl: games.coverUrl,
      rating: reviews.rating,
    })
    .from(reviews)
    .innerJoin(games, eq(games.id, reviews.gameId))
    .where(
      and(
        eq(reviews.userId, user.id),
        eq(reviews.status, "approved"),
        gte(reviews.rating, 8),
      ),
    )
    .orderBy(desc(reviews.rating), desc(reviews.createdAt))
    .limit(10);

  const currentlyPlayingRows = await db
    .select({
      gameId: games.id,
      title: games.title,
      coverUrl: games.coverUrl,
      startedAt: userCurrentlyPlaying.startedAt,
    })
    .from(userCurrentlyPlaying)
    .innerJoin(games, eq(games.id, userCurrentlyPlaying.gameId))
    .where(eq(userCurrentlyPlaying.userId, user.id))
    .orderBy(desc(userCurrentlyPlaying.startedAt));

  const credits = await getCreditsForUser(user.id);
  const tier = trustTier(credits.total);

  // hasPassword = does the user have an email/password identity? Google-only
  // accounts have just a "google" identity and no password — we surface a "Set
  // password" affordance instead of "Change password" for them.
  const hasPassword = (user.identities ?? []).some((i) => i.provider === "email");

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="text-sm text-neutral-400">Signed in as {user.email}</p>
        </div>
        <AvatarUpload
          userId={user.id}
          currentAvatarUrl={profile?.avatarUrl ?? null}
          username={profile?.username ?? user.email ?? "?"}
        />
      </div>

      <Card className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Credits</p>
            <p className="font-mono text-3xl text-neon-cyan">{credits.total.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Trust tier</p>
            <p className="text-lg text-violet-200">{tier.label}</p>
            {tier.next && (
              <p className="text-xs text-neutral-500">
                {tier.next - credits.total} to next tier
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          {credits.approvedReviews} approved log{credits.approvedReviews === 1 ? "" : "s"}
          {credits.inDepthReviews > 0 && (
            <span className="text-emerald-400">
              {" "}
              ({credits.inDepthReviews} in-depth)
            </span>
          )}{" "}
          · {credits.votes} recommendation{credits.votes === 1 ? "" : "s"} cast
        </p>
      </Card>

      <CurrentlyPlayingSection
        initialItems={currentlyPlayingRows.map((r) => ({
          gameId: r.gameId,
          title: r.title,
          coverUrl: r.coverUrl,
          startedAt: r.startedAt.toISOString(),
        }))}
      />

      {topLiked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top 10 games you loved</h2>
          <p className="text-xs text-neutral-500">
            Your highest-rated logs. These shape your &ldquo;For You&rdquo; picks.
          </p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {topLiked.map((g, i) => (
              <li key={g.gameId}>
                <Link
                  href={`/games/${g.gameId}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 hover:border-violet-500"
                >
                  <span className="w-5 text-center font-mono text-sm text-neutral-500">
                    {i + 1}
                  </span>
                  {g.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.coverUrl}
                      alt=""
                      className="h-10 w-14 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-14 flex-shrink-0 rounded bg-neutral-800" />
                  )}
                  <div className="min-w-0 flex-1 truncate font-medium">{g.title}</div>
                  <span className="font-mono text-sm text-violet-300">{g.rating}/10</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <ProfileForm
        initialUsername={profile?.username ?? ""}
        initialGenres={pickedGenres.map((g) => g.genre)}
        initialPlaystyles={pickedPlaystyles.map((p) => p.playstyle)}
        initialExcludedGenres={excludedGenres.map((g) => g.genre)}
        initialExcludedTags={excludedTags.map((t) => t.tag)}
        allGenres={allGenres.map((r) => r.name)}
        allPlaystyles={allPlaystyles.map((r) => r.name)}
      />

      <AccountSecuritySection
        currentEmail={user.email ?? ""}
        hasPassword={hasPassword}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your logs</h2>
        {myReviews.length === 0 ? (
          <p className="text-sm text-neutral-500">
            You haven&apos;t logged any games yet.{" "}
            <Link href="/log" className="text-violet-400 hover:underline">
              Log your first one.
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {myReviews.map((r) => (
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
                    <div className="flex items-center gap-2 truncate font-medium">
                      {r.gameTitle}
                      {r.status === "pending" && (
                        <span className="rounded border border-amber-500/60 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-300">
                          PENDING
                        </span>
                      )}
                      {r.status === "rejected" && (
                        <span className="rounded border border-red-500/60 px-1.5 py-0.5 text-[9px] tracking-widest text-red-300">
                          REJECTED
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-neutral-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                      {r.body && <> · {r.body.slice(0, 80)}{r.body.length > 80 ? "…" : ""}</>}
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
