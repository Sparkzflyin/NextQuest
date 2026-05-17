import { NextResponse } from "next/server";
import { searchGames } from "@/lib/rawg";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await searchGames(q, 8);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "RAWG error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
