"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

export function AnalyticsGate() {
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setAllow(localStorage.getItem("nq_cookie_consent") === "accepted");
      } catch {
        setAllow(false);
      }
    };
    sync();
    window.addEventListener("nq:consent", sync);
    return () => window.removeEventListener("nq:consent", sync);
  }, []);

  return allow ? <Analytics /> : null;
}
