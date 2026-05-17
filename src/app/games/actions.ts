"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { votes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const schema = z.object({
  gameId: z.string().uuid(),
  value: z.union([z.literal(-1), z.literal(1)]),
});

export async function vote(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid vote." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const [existing] = await db
    .select()
    .from(votes)
    .where(and(eq(votes.userId, user.id), eq(votes.gameId, parsed.data.gameId)));

  if (existing?.value === parsed.data.value) {
    await db
      .delete(votes)
      .where(and(eq(votes.userId, user.id), eq(votes.gameId, parsed.data.gameId)));
  } else {
    await db
      .insert(votes)
      .values({ userId: user.id, gameId: parsed.data.gameId, value: parsed.data.value })
      .onConflictDoUpdate({
        target: [votes.userId, votes.gameId],
        set: { value: parsed.data.value },
      });
  }

  revalidatePath(`/games/${parsed.data.gameId}`);
  revalidatePath("/leaderboards");
  revalidatePath("/");
  return { ok: true as const };
}
