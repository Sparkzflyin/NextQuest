"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    // emailRedirectTo flows through Supabase's confirmation email and back into
    // our PKCE callback, which exchanges the code for a session and lands on
    // /profile. Without this the link redirects to the Supabase project URL.
    const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: redirectTo },
    });
    setPending(false);
    if (error) return setError(error.message);
    // If email confirmation is off in the dashboard, signUp returns a session
    // immediately and the user is already logged in. Otherwise data.session is
    // null and we need to wait for them to click the email link.
    router.refresh();
    if (data.session) {
      router.push("/profile");
    } else {
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton next="/profile" />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-neutral-950 px-2 text-neutral-500">or with email</span>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9_-]+"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Sign up"}
      </Button>
      <p className="text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Log in
        </Link>
      </p>
      </form>
    </div>
  );
}
