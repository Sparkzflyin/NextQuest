"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Landing page for the password-reset email flow. The /auth/callback route
// exchanges the recovery code for a session before we get here, so the user
// is authenticated under a recovery session and updateUser({ password }) just
// works — no current-password verification needed (the email link is the proof).
export function ResetPasswordForm() {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) {
      setStatus({ kind: "err", msg: "Password must be at least 8 characters." });
      return;
    }
    if (pwd !== confirm) {
      setStatus({ kind: "err", msg: "Passwords don't match." });
      return;
    }
    setPending(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPending(false);
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    setStatus({ kind: "ok", msg: "Password updated. Redirecting…" });
    setTimeout(() => {
      router.refresh();
      router.push("/profile");
    }, 800);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Set new password"}
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
    </form>
  );
}
