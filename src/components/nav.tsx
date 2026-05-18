import Link from "next/link";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { LogoutButton } from "./logout-button";
import { MobileNav } from "./mobile-nav";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const [p] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.id, user.id));
    isAdmin = !!p?.isAdmin;
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-violet-900/50 bg-[#06070d]/90 backdrop-blur-sm">
      <nav className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-8">
        <Link
          href="/"
          className="font-pixel group flex items-baseline gap-2 text-sm tracking-tight"
        >
          <span className="neon-violet">NEXT</span>
          <span className="text-violet-100 transition-colors group-hover:text-violet-50">
            QUEST
          </span>
          <span className="font-pixel ml-1 hidden text-[9px] text-violet-500 sm:inline">
            v1
          </span>
        </Link>

        <div className="hidden items-center gap-5 text-sm md:flex">
          <Link
            href="/leaderboards"
            className="font-terminal text-lg text-violet-300 hover:text-neon-cyan"
          >
            Leaderboards
          </Link>
          {user ? (
            <>
              <Link
                href="/log"
                className="font-terminal text-lg text-violet-300 hover:text-neon-cyan"
              >
                Log a game
              </Link>
              <Link
                href="/recommendations"
                className="font-terminal text-lg text-violet-300 hover:text-neon-cyan"
              >
                For you
              </Link>
              <Link
                href="/profile"
                className="font-terminal text-lg text-violet-300 hover:text-neon-cyan"
              >
                Profile
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="font-pixel border-2 border-amber-500/70 px-2 py-1 text-[10px] text-amber-300 transition-all hover:bg-amber-950/40 hover:shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                >
                  ADMIN
                </Link>
              )}
              <span className="font-pixel hidden items-center gap-1.5 text-[9px] text-violet-400/80 sm:flex">
                <span className="blink text-neon-green">●</span>
                P1
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="font-terminal text-lg text-violet-300 hover:text-neon-cyan"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="font-pixel border-2 border-neon-violet bg-violet-950/40 px-3 py-1.5 text-[10px] text-violet-100 transition-all hover:bg-violet-900/60 hover:shadow-[0_0_12px_rgba(192,132,252,0.55)]"
              >
                ▶ START
              </Link>
            </>
          )}
        </div>

        <MobileNav signedIn={!!user} isAdmin={isAdmin} />
      </nav>
    </header>
  );
}
