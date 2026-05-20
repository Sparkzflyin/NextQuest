import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { searchGames } from "@/lib/rawg";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { isNsfwFromRawg } from "@/lib/nsfw";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    // Resolve the viewer's NSFW gate. Anonymous + new profiles default to
    // false, matching the rest of the gate (FYP / swipe / leaderboards).
    // Over-fetch when we'll filter so the picker still gets ~8 results.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let allowNsfw = false;
    if (user) {
      const [row] = await db
        .select({ allowNsfw: profiles.allowNsfw })
        .from(profiles)
        .where(eq(profiles.id, user.id));
      allowNsfw = row?.allowNsfw ?? false;
    }
    const raw = await searchGames(q, allowNsfw ? 8 : 16);
    const results = allowNsfw
      ? raw.slice(0, 8)
      : raw.filter((g) => !isNsfwFromRawg({ genres: g.genres, tags: g.tags })).slice(0, 8);
    return NextResponse.json({ results, allowNsfw });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "RAWG error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
