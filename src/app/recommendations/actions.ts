"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { userExcludedGames, userWishlist } from "@/lib/db/schema";

const rawgIdSchema = z.object({ rawgId: z.number().int().positive() });

export async function markNotInterested(input: z.input<typeof rawgIdSchema>) {
  const parsed = rawgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  await db
    .insert(userExcludedGames)
    .values({ userId: user.id, rawgId: parsed.data.rawgId })
    .onConflictDoNothing();
  revalidatePath("/recommendations");
  return { ok: true as const };
}

export async function toggleWishlist(input: z.input<typeof rawgIdSchema>) {
  const parsed = rawgIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const [existing] = await db
    .select()
    .from(userWishlist)
    .where(
      and(
        eq(userWishlist.userId, user.id),
        eq(userWishlist.rawgId, parsed.data.rawgId),
      ),
    );
  if (existing) {
    await db
      .delete(userWishlist)
      .where(
        and(
          eq(userWishlist.userId, user.id),
          eq(userWishlist.rawgId, parsed.data.rawgId),
        ),
      );
  } else {
    await db
      .insert(userWishlist)
      .values({ userId: user.id, rawgId: parsed.data.rawgId })
      .onConflictDoNothing();
  }
  revalidatePath("/recommendations");
  revalidatePath("/profile");
  return { ok: true as const, wishlisted: !existing };
}
