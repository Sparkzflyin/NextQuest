"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyPasswordChange } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Status = { kind: "ok" | "err"; msg: string } | null;

// Verifies the user knows their current password by attempting a sign-in.
// Returns null on success or an error message. signInWithPassword refreshes
// the session for the same user — no functional disruption.
async function verifyCurrentPassword(email: string, password: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "Current password is incorrect.";
  return null;
}

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
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Account &amp; security</h2>
        <p className="text-sm text-neutral-400">Change your sign-in details.</p>
      </div>

      <EmailRow
        currentEmail={currentEmail}
        hasPassword={hasPassword}
        open={emailOpen}
        setOpen={setEmailOpen}
      />

      <div className="border-t border-neutral-800" />

      <PasswordRow
        currentEmail={currentEmail}
        hasPassword={hasPassword}
        open={passwordOpen}
        setOpen={setPasswordOpen}
      />

      {hasPassword && (
        <>
          <div className="border-t border-neutral-800" />
          <ResetPasswordRow
            currentEmail={currentEmail}
            open={resetOpen}
            setOpen={setResetOpen}
          />
        </>
      )}
    </Card>
  );
}

function EmailRow({
  currentEmail,
  hasPassword,
  open,
  setOpen,
}: {
  currentEmail: string;
  hasPassword: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
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

    // Gate: prove knowledge of the current password before allowing the change.
    // Without this, anyone with a hijacked session could redirect the account
    // by changing its email.
    const verifyErr = await verifyCurrentPassword(currentEmail, currentPwd);
    if (verifyErr) {
      setPending(false);
      setStatus({ kind: "err", msg: verifyErr });
      return;
    }

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
    setCurrentPwd("");
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

      {open && !hasPassword && (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-4 text-sm text-neutral-400">
          Set a password first (below). Changing your email requires verifying your password
          so a stolen session can&apos;t hand the account to someone else.
        </div>
      )}

      {open && hasPassword && (
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
          <div className="space-y-2">
            <Label htmlFor="current-password-for-email">Current password</Label>
            <Input
              id="current-password-for-email"
              type="password"
              autoComplete="current-password"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
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
  currentEmail,
  hasPassword,
  open,
  setOpen,
}: {
  currentEmail: string;
  hasPassword: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [currentPwd, setCurrentPwd] = useState("");
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

    // Only require current-password verification when the user already has one.
    // First-time set (Google-only users adding a password) has nothing to verify.
    if (hasPassword) {
      const verifyErr = await verifyCurrentPassword(currentEmail, currentPwd);
      if (verifyErr) {
        setPending(false);
        setStatus({ kind: "err", msg: verifyErr });
        return;
      }
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setPending(false);
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    // Fire-and-forget — the change itself succeeded, so don't gate the UI on
    // an email round-trip. Only on actual changes (not first-time set); a
    // Google-only user adding their first password doesn't need an alert.
    if (hasPassword) {
      notifyPasswordChange().catch((e) =>
        console.error("password change notification failed:", e),
      );
    }
    setPending(false);
    setStatus({
      kind: "ok",
      msg: hasPassword ? "Password updated." : "Password set. You can now sign in with email too.",
    });
    setCurrentPwd("");
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
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
            </div>
          )}
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
          {hasPassword && (
            <p className="text-xs text-neutral-500">
              Forgot your current password? Use &ldquo;Reset via email&rdquo; below.
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

function ResetPasswordRow({
  currentEmail,
  open,
  setOpen,
}: {
  currentEmail: string;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function onSend() {
    setPending(true);
    setStatus(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(currentEmail, {
      redirectTo,
    });
    setPending(false);
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    setStatus({
      kind: "ok",
      msg: `Check ${currentEmail} for a reset link.`,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Reset via email</p>
          <p className="text-sm text-neutral-400">
            Forgot your password? Send yourself a recovery link.
          </p>
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
          {open ? "Cancel" : "Reset"}
        </Button>
      </div>

      {open && (
        <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/50 p-4">
          <p className="text-xs text-neutral-500">
            We&apos;ll email a one-time link to {currentEmail}. Click it to set a new password
            without needing the current one.
          </p>
          <Button type="button" onClick={onSend} disabled={pending}>
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
        </div>
      )}
    </div>
  );
}
