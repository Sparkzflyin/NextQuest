"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "nq_cookie_consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // localStorage unavailable (private mode, etc) — just don't pester them.
    }
  }, []);

  function decide(choice: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("nq:consent"));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-50 border-2 border-neon-violet bg-[#06070d]/95 p-4 shadow-[0_0_24px_rgba(192,132,252,0.35)] backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md sm:p-5"
    >
      <div className="font-pixel mb-2 flex items-center gap-2 text-[10px] tracking-widest text-neon-cyan neon-cyan">
        <span className="blink">▮</span>
        <span>COOKIE NOTICE</span>
      </div>
      <p className="font-terminal text-lg leading-snug text-violet-100/90">
        We use cookies for your sign-in session and to remember your preferences. No third-party
        tracking or ad cookies — see the{" "}
        <Link href="/cookies" className="text-neon-cyan hover:underline">
          Cookie Policy
        </Link>{" "}
        for the full story.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="font-pixel border-2 border-neon-violet bg-violet-950/40 px-4 py-2.5 text-[10px] tracking-widest text-violet-100 transition-all hover:bg-violet-900/60 hover:shadow-[0_0_12px_rgba(192,132,252,0.55)]"
        >
          ▶ ACCEPT
        </button>
        <button
          type="button"
          onClick={() => decide("declined")}
          className="font-pixel border-2 border-violet-800/60 px-4 py-2.5 text-[10px] tracking-widest text-violet-300 transition-all hover:border-violet-500 hover:text-violet-100"
        >
          DECLINE
        </button>
      </div>
    </div>
  );
}
