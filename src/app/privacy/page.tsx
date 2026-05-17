export const metadata = { title: "Privacy Policy · NextQuest" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header>
        <p className="font-pixel text-[10px] tracking-widest text-neon-cyan neon-cyan">
          ── LEGAL ──
        </p>
        <h1 className="heading-pixel mt-3 text-xl sm:text-2xl">PRIVACY POLICY</h1>
        <p className="font-terminal mt-2 text-lg text-violet-400/70">
          Last updated: stand-in copy · final version coming before public launch
        </p>
      </header>

      <section className="font-terminal space-y-5 text-xl leading-snug text-violet-100/85">
        <p>
          NextQuest collects only what it needs to run the leaderboards: your account email, a
          username you choose, the games you log, and the votes and ratings you cast. We do not sell
          this information to third parties.
        </p>
        <p>
          Authentication is handled by Supabase. Game metadata comes from the RAWG API. Both
          services receive only the data required to complete the requests you initiate.
        </p>
        <p>
          You can delete your account at any time from your profile page. Deletion removes your
          profile, votes, and logs from public-facing leaderboards.
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
