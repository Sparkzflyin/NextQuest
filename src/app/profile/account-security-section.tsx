"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = { kind: "ok" | "err"; msg: string } | null;

// Account & security panel. Pure client component — updateUser() goes through
// the browser supabase client so we have window.location.origin for the
// emailRedirectTo. Server actions would force us to thread origin through
// headers, which is fragile.
export function AccountSecuritySection({
  currentEmail,
  hasPassword,
}: {
  currentEmail: string;
  hasPassword: boolean;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Account &amp; security</h2>
        <p className="text-sm text-neutral-400">Change your sign-in details.</p>
      </div>

      <EmailRow
        currentEmail={currentEmail}
        open={emailOpen}
        setOpen={setEmailOpen}
      />

      <div className="border-t border-neutral-800" />

      <PasswordRow
        hasPassword={hasPassword}
        open={passwordOpen}
        setOpen={setPasswordOpen}
      />
    </Card>
  );
}

function EmailRow({
  currentEmail,
  open,
  setOpen,
}: {
  currentEmail: string;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setStatus({ kind: "err", msg: "That's already your email." });
      return;
    }
    setPending(true);
    setStatus(null);
    const supabase = createClient();
    // Same callback route the signup/google flows use — exchanges the PKCE
    // code from the confirmation email for a session and lands on /profile.
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: redirectTo },
    );
    setPending(false);
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    setStatus({
      kind: "ok",
      msg: `Check ${newEmail} (and ${currentEmail}) for confirmation links — the change isn't final until both are clicked.`,
    });
    setNewEmail("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Email</p>
          <p className="truncate font-mono text-sm text-neutral-200">{currentEmail}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(!open);
            setStatus(null);
          }}
        >
          {open ? "Cancel" : "Change"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/50 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <p className="text-xs text-neutral-500">
            We&apos;ll email a confirmation link to the new address (and to your current one).
            Your email stays the same until both are confirmed.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send confirmation"}
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
      )}
    </div>
  );
}

function PasswordRow({
  hasPassword,
  open,
  setOpen,
}: {
  hasPassword: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

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
    setStatus({
      kind: "ok",
      msg: hasPassword ? "Password updated." : "Password set. You can now sign in with email too.",
    });
    setPwd("");
    setConfirm("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Password</p>
          {hasPassword ? (
            <p className="font-mono text-sm text-neutral-200">••••••••</p>
          ) : (
            <p className="text-sm text-neutral-500">Not set — you sign in with Google.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(!open);
            setStatus(null);
          }}
        >
          {open ? "Cancel" : hasPassword ? "Change" : "Set"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/50 p-4"
        >
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
          {!hasPassword && (
            <p className="text-xs text-neutral-500">
              Setting a password gives you a second way in — Google sign-in keeps working.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Updating…" : hasPassword ? "Update password" : "Set password"}
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
      )}
    </div>
  );
}
