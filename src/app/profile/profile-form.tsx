"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile } from "./actions";
import { cn } from "@/lib/utils";

export function ProfileForm({
  initialUsername,
  initialGenres,
  initialPlaystyles,
  allGenres,
  allPlaystyles,
}: {
  initialUsername: string;
  initialGenres: string[];
  initialPlaystyles: string[];
  allGenres: string[];
  allPlaystyles: string[];
}) {
  const [username, setUsername] = useState(initialUsername);
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [playstyles, setPlaystyles] = useState<string[]>(initialPlaystyles);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pending, start] = useTransition();

  function toggleGenre(g: string) {
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  function togglePlaystyle(p: string) {
    setPlaystyles((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    start(async () => {
      const result = await saveProfile({ username, genres, playstyles });
      setStatus(
        result.ok
          ? { kind: "ok", msg: "Saved." }
          : { kind: "err", msg: result.error ?? "Something went wrong." },
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9_-]+"
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Favorite genres</Label>
        <p className="text-sm text-neutral-400">
          We use these to recommend games for you. Pick as many as you want.
        </p>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((g) => {
            const active = genres.includes(g);
            return (
              <button
                type="button"
                key={g}
                onClick={() => toggleGenre(g)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-violet-500 bg-violet-600/20 text-violet-200"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500",
                )}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Favorite playstyles</Label>
        <p className="text-sm text-neutral-400">
          How do you like to play? We&apos;ll match games whose reviewers tagged the same things.
        </p>
        <div className="flex flex-wrap gap-2">
          {allPlaystyles.map((p) => {
            const active = playstyles.includes(p);
            return (
              <button
                type="button"
                key={p}
                onClick={() => togglePlaystyle(p)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-violet-500 bg-violet-600/20 text-violet-200"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {status && (
        <p className={cn("text-sm", status.kind === "ok" ? "text-emerald-400" : "text-red-400")}>
          {status.msg}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
