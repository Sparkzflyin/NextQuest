import { count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { votes } from "@/lib/db/schema";

// Credits are derived (not stored), so they always reflect current state.
// Stakeholder note: reviews should be worth far more than votes — a review is
// the slow, considered contribution; a vote is a quick signal.
export const CREDITS_PER_APPROVED_REVIEW = 25;
// Stacked on top of the base 25 when a review fills out all 3 subscores AND
// all 3 axis notes meet IN_DEPTH_NOTE_MIN_CHARS. The bonus is intentionally
// non-trivial so it feels earned, not a freebie.
export const CREDITS_PER_IN_DEPTH_REVIEW = 10;
export const IN_DEPTH_NOTE_MIN_CHARS = 40;
export const CREDITS_PER_VOTE = 1;
// Swipes earn at half a credit each but capped per day so the deck can't be
// farmed to grind credits. Skips don't count (they're not a real signal).
export const CREDITS_PER_SWIPE = 0.5;
export const MAX_DAILY_SWIPES = 20;

export async function getCreditsForUser(userId: string): Promise<{
  total: number;
  approvedReviews: number;
  inDepthReviews: number;
  reviewCredits: number; // sum of per-review credits (respects admin overrides)
  votes: number;
  swipes: number; // capped daily total summed across all days
}> {
  // Aggregate per-review credits in SQL so admin overrides are honored. Each
  // approved review contributes either its credit_override (if set) or
  // (base + in_depth_bonus_if_qualifies). We also surface the raw approved
  // count and the in-depth count for the breakdown UI.
  const reviewRow = await db.execute<{
    approved: number;
    in_depth: number;
    review_credits: number;
  }>(sql`
    select
      count(*)::int as approved,
      count(*) filter (
        where gameplay_rating  is not null
          and narrative_rating is not null
          and design_rating    is not null
          and char_length(coalesce(gameplay_notes, ''))  >= ${IN_DEPTH_NOTE_MIN_CHARS}
          and char_length(coalesce(narrative_notes, '')) >= ${IN_DEPTH_NOTE_MIN_CHARS}
          and char_length(coalesce(design_notes, ''))    >= ${IN_DEPTH_NOTE_MIN_CHARS}
      )::int as in_depth,
      coalesce(
        sum(
          coalesce(
            credit_override,
            ${CREDITS_PER_APPROVED_REVIEW} + case
              when gameplay_rating  is not null
               and narrative_rating is not null
               and design_rating    is not null
               and char_length(coalesce(gameplay_notes, ''))  >= ${IN_DEPTH_NOTE_MIN_CHARS}
               and char_length(coalesce(narrative_notes, '')) >= ${IN_DEPTH_NOTE_MIN_CHARS}
               and char_length(coalesce(design_notes, ''))    >= ${IN_DEPTH_NOTE_MIN_CHARS}
              then ${CREDITS_PER_IN_DEPTH_REVIEW}
              else 0
            end
          )
        ),
        0
      )::int as review_credits
    from public.reviews
    where user_id = ${userId} and status = 'approved'
  `);
  const reviewStats = (reviewRow as unknown as {
    approved: number;
    in_depth: number;
    review_credits: number;
  }[])[0] ?? { approved: 0, in_depth: 0, review_credits: 0 };

  const [v] = await db
    .select({ n: count() })
    .from(votes)
    .where(eq(votes.userId, userId));

  // Per-day swipe count capped at MAX_DAILY_SWIPES, summed across all days.
  // Skips excluded. The cap is applied per day so today's grind doesn't void
  // yesterday's.
  const swipeRows = await db.execute<{ swipes_capped: number }>(sql`
    select coalesce(sum(daily_count), 0)::int as swipes_capped
    from (
      select least(count(*), ${MAX_DAILY_SWIPES})::int as daily_count
      from public.swipes
      where user_id = ${userId} and action <> 'skip'
      group by date_trunc('day', swiped_at)
    ) sub
  `);
  const swipesCapped = (swipeRows as unknown as { swipes_capped: number }[])[0]
    ?.swipes_capped ?? 0;

  const voteCount = v?.n ?? 0;
  return {
    approvedReviews: reviewStats.approved,
    inDepthReviews: reviewStats.in_depth,
    reviewCredits: reviewStats.review_credits,
    votes: voteCount,
    swipes: swipesCapped,
    total: Math.floor(
      reviewStats.review_credits +
        voteCount * CREDITS_PER_VOTE +
        swipesCapped * CREDITS_PER_SWIPE,
    ),
  };
}

// How many swipes the user has done today, used to gate the deck.
export async function getSwipesUsedToday(userId: string): Promise<number> {
  const rows = await db.execute<{ n: number }>(sql`
    select count(*)::int as n
    from public.swipes
    where user_id = ${userId}
      and action <> 'skip'
      and swiped_at >= date_trunc('day', now())
  `);
  return (rows as unknown as { n: number }[])[0]?.n ?? 0;
}

// What the default credit value for a review would be, ignoring any override.
// Pure function, used by the admin UI to show "default vs override" hints.
export function defaultReviewCredits(qualifiesAsInDepth: boolean): number {
  return (
    CREDITS_PER_APPROVED_REVIEW +
    (qualifiesAsInDepth ? CREDITS_PER_IN_DEPTH_REVIEW : 0)
  );
}

// "Trust" tier — purely cosmetic, driven by credit total. Used on profile.
export function trustTier(total: number): { label: string; next: number | null } {
  if (total >= 500) return { label: "Veteran", next: null };
  if (total >= 200) return { label: "Pro", next: 500 };
  if (total >= 75) return { label: "Regular", next: 200 };
  if (total >= 25) return { label: "Rookie", next: 75 };
  return { label: "Newcomer", next: 25 };
}
