export const metadata = { title: "Terms of Use · NextQuest" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header>
        <p className="font-pixel text-[10px] tracking-widest text-neon-cyan neon-cyan">
          ── LEGAL ──
        </p>
        <h1 className="heading-pixel mt-3 text-xl sm:text-2xl">TERMS OF USE</h1>
        <p className="font-terminal mt-2 text-lg text-violet-400/70">
          Last updated: stand-in copy · final version coming before public launch
        </p>
      </header>

      <section className="font-terminal space-y-5 text-xl leading-snug text-violet-100/85">
        <p>
          By creating an account you agree to keep your username and reviews clean of harassment,
          spam, and content that violates applicable law. We reserve the right to remove logs,
          reviews, or accounts that do.
        </p>
        <p>
          Votes and ratings should reflect honest impressions of the games you have actually played.
          Vote brigading, sockpuppeting, or any attempt to artificially influence leaderboard
          standings will result in account removal.
        </p>
        <p>
          NextQuest is provided as-is during this early build. Features, leaderboards, and policies
          may change as the project matures.
        </p>
        <p className="text-violet-400/70">
          Questions? Reach out at{" "}
          <a className="neon-cyan" href="mailto:hello@nextquest.gg">
            hello@nextquest.gg
          </a>
          .
        </p>
      </section>
    </div>
  );
}
