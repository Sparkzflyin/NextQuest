import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-800 bg-neutral-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold tracking-tight text-neutral-100">
          <span className="text-violet-400">Next</span>Quest
        </Link>
        <div className="flex items-center gap-4 text-sm text-neutral-300">
          <Link href="/leaderboards" className="hover:text-white">
            Leaderboards
          </Link>
          {user ? (
            <>
              <Link href="/log" className="hover:text-white">
                Log a game
              </Link>
              <Link href="/recommendations" className="hover:text-white">
                For you
              </Link>
              <Link href="/profile" className="hover:text-white">
                Profile
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-500"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
