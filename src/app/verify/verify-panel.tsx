"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// 30s cooldown matches Supabase's default rate limit on the resend endpoint
// (4/hour with a per-request minimum). Below that Supabase will 429 and the
// user sees a confusing error.
const RESEND_COOLDOWN_S = 30;

export function VerifyPanel({
  emailPromise,
}: {
  emailPromise: Promise<{ email?: string }>;
}) {
  const { email } = use(emailPromise);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  // Tick down the cooldown. Starts at full duration so a user landing here
  // straight from signup can't immediately spam Supabase.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function onResend() {
    if (!email || cooldown > 0 || status.kind === "sending") return;
    setStatus({ kind: "sending" });
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent" });
    setCooldown(RESEND_COOLDOWN_S);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-4 text-sm">
        {email ? (
          <>
            We sent a link to <span className="text-neutral-100">{email}</span>. Open it in this
            browser and you&apos;ll be signed in automatically.
          </>
        ) : (
          <>We sent a confirmation link to the email you signed up with.</>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onResend}
        disabled={!email || cooldown > 0 || status.kind === "sending"}
        className="w-full"
      >
        {status.kind === "sending"
          ? "Sending…"
          : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend confirmation email"}
      </Button>

      {status.kind === "sent" && (
        <p className="text-sm text-emerald-400">Sent. Check your inbox (and spam).</p>
      )}
      {status.kind === "error" && (
        <p className="text-sm text-red-400">{status.message}</p>
      )}

      <p className="text-sm text-neutral-400">
        Wrong email?{" "}
        <Link href="/signup" className="text-violet-400 hover:underline">
          Sign up again
        </Link>{" "}
        ·{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
