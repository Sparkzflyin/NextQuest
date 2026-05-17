import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="relative z-40 border-b-2 border-violet-900/50 bg-[#06070d]/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
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

        <div className="flex items-center gap-5 text-sm">
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
      </nav>
    </header>
  );
}
