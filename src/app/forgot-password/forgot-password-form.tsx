"use client";

import { use, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({
  emailPromise,
}: {
  emailPromise: Promise<{ email?: string }>;
}) {
  const { email: prefill } = use(emailPromise);
  const [email, setEmail] = useState(prefill ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    const supabase = createClient();
    // Same redirect target as the in-profile "Reset via email" path — the
    // callback route exchanges the recovery code, then /reset-password lets
    // the user set a new password under their fresh recovery session.
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setPending(false);
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    setStatus({
      kind: "ok",
      msg: `If an account exists for ${email}, a reset link is on its way.`,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      {status && (
        <p
          className={cn(
            "text-sm",
            status.kind === "ok" ? "text-emerald-400" : "text-red-400",
          )}
        >
          {status.msg}
        </p>
      )}
      <p className="text-sm text-neutral-400">
        Remembered it?{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
