"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
};

export function MobileNav({ signedIn, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 flex h-11 w-11 items-center justify-center border-2 border-violet-800/60 bg-[#06070d] text-violet-200 transition-colors hover:border-neon-violet hover:text-neon-violet"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 top-full z-40 border-b-2 border-violet-900/70 bg-[#06070d]/95 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur">
            <nav className="flex flex-col gap-1 px-4 py-3">
              <MobileLink href="/">Home</MobileLink>
              <MobileLink href="/leaderboards">Leaderboards</MobileLink>
              {signedIn ? (
                <>
                  <MobileLink href="/log">Log a game</MobileLink>
                  <MobileLink href="/recommendations">For you</MobileLink>
                  <MobileLink href="/swipe">Swipe</MobileLink>
                  <MobileLink href="/profile">Profile</MobileLink>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="font-pixel mt-1 flex items-center justify-between border-2 border-amber-500/70 px-4 py-3 text-[11px] text-amber-300"
                    >
                      <span>ADMIN</span>
                      <span className="text-amber-500">▶</span>
                    </Link>
                  )}
                  <div className="mt-2 border-t border-violet-900/50 pt-2">
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <>
                  <MobileLink href="/login">Log in</MobileLink>
                  <Link
                    href="/signup"
                    className="font-pixel mt-2 flex items-center justify-between border-2 border-neon-violet bg-violet-950/40 px-4 py-3 text-[11px] text-violet-100"
                  >
                    <span>▶ START</span>
                    <span className="text-violet-300">NEW ACCOUNT</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-terminal block px-4 py-3 text-xl text-violet-200 transition-colors hover:bg-violet-950/40 hover:text-neon-cyan"
    >
      {children}
    </Link>
  );
}
