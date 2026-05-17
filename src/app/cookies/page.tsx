export const metadata = { title: "Cookie Policy · NextQuest" };

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header>
        <p className="font-pixel text-[10px] tracking-widest text-neon-cyan neon-cyan">
          ── LEGAL ──
        </p>
        <h1 className="heading-pixel mt-3 text-xl sm:text-2xl">COOKIE POLICY</h1>
        <p className="font-terminal mt-2 text-lg text-violet-400/70">
          Last updated: stand-in copy · final version coming before public launch
        </p>
      </header>

      <section className="font-terminal space-y-5 text-xl leading-snug text-violet-100/85">
        <p>
          NextQuest uses cookies for authentication sessions (handled by Supabase) and to remember
          your interface preferences. We do not run third-party advertising or tracking cookies.
        </p>
        <p>
          You can clear cookies at any time from your browser settings. Logging out also revokes the
          session token stored in your cookie.
        </p>
      </section>
    </div>
  );
}
