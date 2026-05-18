"use client";

export function CookiePreferencesButton() {
  function reopen() {
    try {
      localStorage.removeItem("nq_cookie_consent");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("nq:consent"));
  }

  return (
    <button type="button" onClick={reopen} className="text-left hover:text-neon-cyan">
      &gt; Cookie preferences
    </button>
  );
}
