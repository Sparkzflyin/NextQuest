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
          Effective Date: May 18, 2026 · Last Updated: May 18, 2026
        </p>
      </header>

      <section className="font-terminal space-y-8 text-xl leading-snug text-violet-100/85">
        <div className="space-y-3">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            1. WHAT THIS POLICY COVERS
          </h2>
          <p>
            This Cookie Policy explains how NextQuests.com (the &ldquo;Site&rdquo;), operated by
            Senscode, a registered trade name of Sensormedia LLC, uses cookies and similar
            storage technologies (such as browser localStorage). It also describes the choices
            available to you when you visit the Site.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            2. WHAT ARE COOKIES AND SIMILAR TECHNOLOGIES
          </h2>
          <p>
            Cookies are small text files that a website places on your device to remember
            information about your visit. Similar technologies, such as browser localStorage,
            store information in your browser in a comparable way. For brevity, this Policy uses
            &ldquo;cookies&rdquo; to refer to both.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            3. COOKIES WE USE
          </h2>

          <h3 className="font-pixel text-[11px] tracking-widest text-neon-cyan neon-cyan">
            3.1 Strictly Necessary
          </h3>
          <p>
            These are required for the Site to function and cannot be turned off. They are set
            when you sign in and identify your session so the Site knows who is logged in.
          </p>
          <ul className="list-disc space-y-1 pl-6 text-violet-100/85">
            <li>
              <strong className="text-violet-100">Authentication session cookies</strong> —
              issued and managed by our authentication provider (Supabase) when you log in.
              Logging out revokes the session.
            </li>
            <li>
              <strong className="text-violet-100">Consent preference</strong> — when you
              accept or decline non-essential cookies via the banner, your choice is stored in
              your browser&rsquo;s localStorage under the key{" "}
              <code className="font-pixel text-[14px] text-neon-cyan">nq_cookie_consent</code>{" "}
              so we do not show the banner again on every visit.
            </li>
          </ul>

          <h3 className="font-pixel text-[11px] tracking-widest text-neon-cyan neon-cyan">
            3.2 Analytics (Optional — Consent Required)
          </h3>
          <p>
            With your consent, we use Vercel Web Analytics to understand which pages on the Site
            are visited and how often. Vercel Web Analytics is designed to be privacy-friendly:
            it does not set tracking cookies and does not collect personally identifying
            information. It records anonymous page-view events from your browser to Vercel&rsquo;s
            servers. If you decline non-essential cookies, this is not enabled.
          </p>
          <p>
            For details on how Vercel processes this data, please review Vercel&rsquo;s privacy
            policy on their website.
          </p>

          <h3 className="font-pixel text-[11px] tracking-widest text-neon-cyan neon-cyan">
            3.3 Advertising
          </h3>
          <p>
            The Site may, in the future, display advertising provided by third-party ad networks.
            Those networks may set their own cookies, web beacons, or similar technologies. If
            and when advertising is introduced, this Policy will be updated and your consent will
            be re-requested where required by law. We currently do not run advertising cookies.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            4. YOUR CHOICES
          </h2>
          <p>You can control cookies in the following ways:</p>
          <ul className="list-disc space-y-2 pl-6 text-violet-100/85">
            <li>
              <strong className="text-violet-100">Banner choice:</strong> On your first visit you
              will see a cookie notice with Accept and Decline buttons. Accepting enables
              optional analytics; declining keeps it disabled.
            </li>
            <li>
              <strong className="text-violet-100">Change your decision later:</strong> Open your
              browser&rsquo;s developer tools and remove the{" "}
              <code className="font-pixel text-[14px] text-neon-cyan">nq_cookie_consent</code>{" "}
              entry from localStorage, or clear site data for NextQuests.com. The banner will
              reappear on your next visit so you can choose again.
            </li>
            <li>
              <strong className="text-violet-100">Browser settings:</strong> Most browsers allow
              you to block or delete cookies. Disabling strictly-necessary cookies will prevent
              you from staying logged in.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            5. THIRD PARTIES
          </h2>
          <p>
            The following third parties may receive information through cookies and similar
            technologies described above:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-violet-100/85">
            <li>
              <strong className="text-violet-100">Supabase</strong> — authentication provider;
              receives the session information required to keep you logged in.
            </li>
            <li>
              <strong className="text-violet-100">Vercel</strong> — hosting provider and the
              source of optional Web Analytics; only enabled with your consent.
            </li>
          </ul>
          <p>
            We do not sell information collected through cookies. See our Privacy Policy for
            details on how information is collected, used, and shared.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            6. CHANGES TO THIS POLICY
          </h2>
          <p>
            We may update this Cookie Policy as the Site evolves. The &ldquo;Last Updated&rdquo;
            date at the top reflects the most recent revision. Continued use of the Site after
            changes constitutes acceptance of the revised Policy.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-pixel text-sm tracking-widest text-violet-100 neon-violet">
            7. CONTACT
          </h2>
          <p>For questions about cookies or this Policy, contact:</p>
          <p>
            <strong className="text-violet-100">Sensormedia LLC</strong> (d/b/a Senscode)
            <br />
            Email: Christian.Sparks@senscode.com
            <br />
            Address: Business address available upon request
          </p>
        </div>
      </section>
    </div>
  );
}
