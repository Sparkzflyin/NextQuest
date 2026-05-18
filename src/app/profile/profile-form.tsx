"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile } from "./actions";
import { filterTags, sanitizeTag } from "@/lib/tags";
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
  const [genreQuery, setGenreQuery] = useState("");
  const [playstyleQuery, setPlaystyleQuery] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pending, start] = useTransition();

  // Merge canonical + currently-selected so custom user-added playstyles render
  // as highlighted chips alongside the canonical 12, not just held silently in state.
  const playstyleOptions = Array.from(new Set([...allPlaystyles, ...playstyles])).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  // Selected chips stay visible even when filtered, so users never lose sight of their picks.
  const visibleGenres = filterTags(allGenres, genres, genreQuery);
  const visiblePlaystyles = filterTags(playstyleOptions, playstyles, playstyleQuery);

  // Custom-tag draft for playstyles only. Genres are RAWG-driven, no user creation.
  const customPlaystyleDraft = (() => {
    const clean = sanitizeTag(playstyleQuery);
    if (!clean) return null;
    const exists = playstyleOptions.some((t) => t.toLowerCase() === clean.toLowerCase());
    return exists ? null : clean;
  })();

  function addCustomPlaystyle() {
    if (!customPlaystyleDraft) return;
    setPlaystyles((cur) =>
      cur.includes(customPlaystyleDraft) ? cur : [...cur, customPlaystyleDraft],
    );
    setPlaystyleQuery("");
  }

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
        <Label htmlFor="genre-search">Favorite genres</Label>
        <p className="text-sm text-neutral-400">
          We use these to recommend games for you. Pick as many as you want.
        </p>
        <Input
          id="genre-search"
          type="search"
          placeholder="Search genres…"
          value={genreQuery}
          onChange={(e) => setGenreQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {visibleGenres.length === 0 ? (
            <p className="text-sm text-neutral-500">No matches for &ldquo;{genreQuery}&rdquo;.</p>
          ) : (
            visibleGenres.map((g) => {
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
            })
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="playstyle-search">Favorite playstyles</Label>
        <p className="text-sm text-neutral-400">
          How do you like to play? We&apos;ll match games whose reviewers tagged the same things.
          Don&apos;t see what you want? Type it and add it.
        </p>
        <div className="flex gap-2">
          <Input
            id="playstyle-search"
            type="search"
            placeholder="Search or add a playstyle…"
            value={playstyleQuery}
            onChange={(e) => setPlaystyleQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customPlaystyleDraft) {
                e.preventDefault();
                addCustomPlaystyle();
              }
            }}
          />
          {customPlaystyleDraft && (
            <Button type="button" variant="outline" onClick={addCustomPlaystyle}>
              + Add &ldquo;{customPlaystyleDraft}&rdquo;
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {visiblePlaystyles.length === 0 && !customPlaystyleDraft ? (
            <p className="text-sm text-neutral-500">
              No matches for &ldquo;{playstyleQuery}&rdquo;.
            </p>
          ) : (
            visiblePlaystyles.map((p) => {
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
            })
          )}
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
