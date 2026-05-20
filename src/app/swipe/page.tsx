import Link from "next/link";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { getSwipesUsedToday, MAX_DAILY_SWIPES } from "@/lib/credits";
import { fetchSwipeQueue, type SwipeCard } from "./actions";
import { SwipeDeck } from "./swipe-deck";

const INITIAL_QUEUE = 12;

export const metadata = { title: "Swipe · NextQuest" };

export default async function SwipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const usedToday = await getSwipesUsedToday(user.id);
  const remaining = Math.max(0, MAX_DAILY_SWIPES - usedToday);

  const [profileRow] = await db
    .select({ allowNsfw: profiles.allowNsfw })
    .from(profiles)
    .where(eq(profiles.id, user.id));
  const allowNsfw = profileRow?.allowNsfw ?? false;

  const result = await fetchSwipeQueue({ count: INITIAL_QUEUE });
  const initialCards: SwipeCard[] = result.ok ? result.cards : [];

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Swipe</h1>
        <p className="text-sm text-neutral-400">
          Right to recommend · Left to hide · Up to wishlist · Down to skip
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {remaining > 0
            ? `${remaining} of ${MAX_DAILY_SWIPES} credit-earning swipes left today`
            : `Daily credit cap hit — keep swiping for fun, no more credits today`}
        </p>
        {!allowNsfw && (
          <p className="mt-1 text-xs text-red-300/80">
            Adult content hidden ·{" "}
            <Link href="/profile" className="underline hover:text-red-200">
              manage in profile
            </Link>
          </p>
        )}
      </div>

      {initialCards.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400">
            No cards in your queue. Either you&apos;ve swept the catalog or your{" "}
            <Link href="/profile" className="text-violet-400 hover:underline">
              favorite genres
            </Link>{" "}
            need a refresh.
          </p>
        </Card>
      ) : (
        <SwipeDeck initialCards={initialCards} initialRemaining={remaining} />
      )}
    </div>
  );
}
