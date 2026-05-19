"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, reviews } from "@/lib/db/schema";

// Path 3 promotion threshold: a custom playstyle becomes canonical once it
// appears on this many approved reviews. Tweak if the curve feels wrong.
const PLAYSTYLE_PROMOTION_THRESHOLD = 5;

const approveSchema = z.object({
  reviewId: z.string().uuid(),
  // null = use default (25 + 10 if in-depth). 0-100 = explicit override.
  creditOverride: z.number().int().min(0).max(100).nullable(),
});

const idOnlySchema = z.object({ reviewId: z.string().uuid() });

const overrideOnlySchema = z.object({
  reviewId: z.string().uuid(),
  creditOverride: z.number().int().min(0).max(100).nullable(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [p] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.id, user.id));
  if (!p?.isAdmin) return null;
  return user.id;
}

export async function approveReview(input: z.input<typeof approveSchema>) {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false as const, error: "Forbidden." };

  const [row] = await db
    .update(reviews)
    .set({
      status: "approved",
      moderatedAt: new Date(),
      moderatedBy: adminId,
      creditOverride: parsed.data.creditOverride,
    })
    .where(eq(reviews.id, parsed.data.reviewId))
    .returning({ gameId: reviews.gameId });

  if (row) {
    // Promote any playstyle that's now on ≥ threshold approved reviews into the
    // canonical list. Idempotent — no-ops for tags already promoted.
    await db.execute(sql`
      insert into public.canonical_playstyles (name)
      select tag
      from (
        select unnest(playstyle) as tag, count(*) as n
        from public.reviews
        where status = 'approved'
        group by tag
      ) c
      where c.n >= ${PLAYSTYLE_PROMOTION_THRESHOLD}
      on conflict (name) do nothing
    `);

    revalidatePath("/admin");
    revalidatePath(`/games/${row.gameId}`);
    revalidatePath("/");
    revalidatePath("/log");
    revalidatePath("/profile");
  }
  return { ok: true as const };
}

export async function rejectReview(input: z.input<typeof idOnlySchema>) {
  const parsed = idOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid id." };
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false as const, error: "Forbidden." };

  const [row] = await db
    .update(reviews)
    .set({ status: "rejected", moderatedAt: new Date(), moderatedBy: adminId })
    .where(eq(reviews.id, parsed.data.reviewId))
    .returning({ gameId: reviews.gameId });

  if (row) {
    revalidatePath("/admin");
    revalidatePath(`/games/${row.gameId}`);
    revalidatePath("/");
  }
  return { ok: true as const };
}

// Retroactively dial credits up or down on an already-approved review. Same
// validation as the approve flow. Doesn't change status.
export async function setCreditOverride(input: z.input<typeof overrideOnlySchema>) {
  const parsed = overrideOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };
  const adminId = await requireAdmin();
  if (!adminId) return { ok: false as const, error: "Forbidden." };

  const [row] = await db
    .update(reviews)
    .set({ creditOverride: parsed.data.creditOverride })
    .where(eq(reviews.id, parsed.data.reviewId))
    .returning({ gameId: reviews.gameId });

  if (row) {
    revalidatePath("/admin");
    revalidatePath(`/games/${row.gameId}`);
    revalidatePath("/profile");
  }
  return { ok: true as const };
}
