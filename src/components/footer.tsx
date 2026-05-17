import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-40 mt-12 border-t-2 border-violet-900/50 bg-[#0a0c18]/90 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="font-pixel flex items-baseline gap-1 text-sm">
              <span className="neon-violet">NEXT</span>
              <span className="text-violet-100">QUEST</span>
            </Link>
            <p className="font-terminal mt-3 text-lg leading-snug text-violet-300/70">
              Community-ranked top 20 for every game genre. Log it. Rate it. Climb.
            </p>
            <p className="font-pixel mt-4 text-[9px] tracking-widest text-violet-500/60">
              <span className="blink text-neon-green">●</span>
              <span className="ml-2">ONLINE · v1.0.0</span>
            </p>
          </div>

          <div>
            <h3 className="font-pixel mb-4 text-[10px] tracking-widest text-neon-cyan neon-cyan">
              ── NAVIGATE ──
            </h3>
            <ul className="font-terminal space-y-2 text-lg text-violet-300/85">
              <li>
                <Link href="/" className="hover:text-neon-cyan">
                  &gt; Home
                </Link>
              </li>
              <li>
                <Link href="/leaderboards" className="hover:text-neon-cyan">
                  &gt; Leaderboards
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-neon-cyan">
                  &gt; Create account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-neon-cyan">
                  &gt; Log in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-pixel mb-4 text-[10px] tracking-widest text-neon-cyan neon-cyan">
              ── COMMUNITY ──
            </h3>
            <ul className="font-terminal space-y-2 text-lg text-violet-300/85">
              <li>
                <Link href="/log" className="hover:text-neon-cyan">
                  &gt; Log a game
                </Link>
              </li>
              <li>
                <Link href="/recommendations" className="hover:text-neon-cyan">
                  &gt; For you
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-neon-cyan">
                  &gt; Your profile
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@nextquest.gg"
                  className="hover:text-neon-cyan"
                >
                  &gt; Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-pixel mb-4 text-[10px] tracking-widest text-neon-cyan neon-cyan">
              ── LEGAL ──
            </h3>
            <ul className="font-terminal space-y-2 text-lg text-violet-300/85">
              <li>
                <Link href="/privacy" className="hover:text-neon-cyan">
                  &gt; Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-neon-cyan">
                  &gt; Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-neon-cyan">
                  &gt; Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="font-pixel mt-10 flex flex-col items-center justify-between gap-3 border-t border-violet-900/40 pt-6 text-[10px] tracking-widest text-violet-400/70 sm:flex-row">
          <span>© 2026 NEXTQUEST CORP · ALL RIGHTS RESERVED</span>
          <span className="flex items-center gap-2">
            <span>POWERED BY</span>
            <a
              href="https://senscode.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="neon-gold transition-all hover:text-yellow-200 hover:drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]"
            >
              SENSCODE
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
