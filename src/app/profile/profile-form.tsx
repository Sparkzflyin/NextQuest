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
  initialExcludedGenres,
  initialExcludedTags,
  initialAllowNsfw,
  allGenres,
  allPlaystyles,
}: {
  initialUsername: string;
  initialGenres: string[];
  initialPlaystyles: string[];
  initialExcludedGenres: string[];
  initialExcludedTags: string[];
  initialAllowNsfw: boolean;
  allGenres: string[];
  allPlaystyles: string[];
}) {
  const [username, setUsername] = useState(initialUsername);
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [playstyles, setPlaystyles] = useState<string[]>(initialPlaystyles);
  const [excludedGenres, setExcludedGenres] = useState<string[]>(initialExcludedGenres);
  const [excludedTags, setExcludedTags] = useState<string[]>(initialExcludedTags);
  const [allowNsfw, setAllowNsfw] = useState<boolean>(initialAllowNsfw);
  const [genreQuery, setGenreQuery] = useState("");
  const [playstyleQuery, setPlaystyleQuery] = useState("");
  const [excludedGenreQuery, setExcludedGenreQuery] = useState("");
  const [excludedTagQuery, setExcludedTagQuery] = useState("");
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
  const visibleExcludedGenres = filterTags(allGenres, excludedGenres, excludedGenreQuery);

  // Custom-tag draft for playstyles only. Genres are RAWG-driven, no user creation.
  const customPlaystyleDraft = (() => {
    const clean = sanitizeTag(playstyleQuery);
    if (!clean) return null;
    const exists = playstyleOptions.some((t) => t.toLowerCase() === clean.toLowerCase());
    return exists ? null : clean;
  })();

  // Excluded tags are free-form too — anything in RAWG's tag soup is fair game.
  const customExcludedTagDraft = (() => {
    const clean = sanitizeTag(excludedTagQuery);
    if (!clean) return null;
    const exists = excludedTags.some((t) => t.toLowerCase() === clean.toLowerCase());
    return exists ? null : clean;
  })();

  function addCustomPlaystyle() {
    if (!customPlaystyleDraft) return;
    setPlaystyles((cur) =>
      cur.includes(customPlaystyleDraft) ? cur : [...cur, customPlaystyleDraft],
    );
    setPlaystyleQuery("");
  }

  function addExcludedTag() {
    if (!customExcludedTagDraft) return;
    setExcludedTags((cur) =>
      cur.includes(customExcludedTagDraft) ? cur : [...cur, customExcludedTagDraft],
    );
    setExcludedTagQuery("");
  }

  function toggleGenre(g: string) {
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  function togglePlaystyle(p: string) {
    setPlaystyles((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function toggleExcludedGenre(g: string) {
    setExcludedGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  function removeExcludedTag(t: string) {
    setExcludedTags((cur) => cur.filter((x) => x !== t));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    start(async () => {
      const result = await saveProfile({
        username,
        genres,
        playstyles,
        excludedGenres,
        excludedTags,
        allowNsfw,
      });
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

      <div className="space-y-3 rounded-md border border-red-900/40 bg-red-950/10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="allow-nsfw-toggle" className="text-red-200">
              Show NSFW games
            </Label>
            <p className="text-sm text-neutral-400">
              <span className="font-medium text-neutral-300">Off by default</span> — for everyone,
              logged in or not. While off, no adult-flagged titles appear on For You, Swipe, or
              Leaderboards. Flip on only if you want explicit content surfaced.
            </p>
          </div>
          <button
            id="allow-nsfw-toggle"
            type="button"
            role="switch"
            aria-checked={allowNsfw}
            onClick={() => setAllowNsfw((v) => !v)}
            className={cn(
              "relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
              allowNsfw
                ? "border-red-500 bg-red-600/40"
                : "border-neutral-700 bg-neutral-900",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                allowNsfw ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Status:{" "}
          <span className={allowNsfw ? "text-red-300" : "text-emerald-400"}>
            {allowNsfw ? "Adult content allowed" : "Adult content blocked"}
          </span>
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-red-900/40 bg-red-950/10 p-4">
        <Label htmlFor="excluded-genre-search" className="text-red-200">
          Never show me these genres
        </Label>
        <p className="text-sm text-neutral-400">
          Games tagged with these won&apos;t appear on your &ldquo;For You&rdquo; page.
        </p>
        <Input
          id="excluded-genre-search"
          type="search"
          placeholder="Search genres to block…"
          value={excludedGenreQuery}
          onChange={(e) => setExcludedGenreQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {visibleExcludedGenres.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No matches for &ldquo;{excludedGenreQuery}&rdquo;.
            </p>
          ) : (
            visibleExcludedGenres.map((g) => {
              const active = excludedGenres.includes(g);
              return (
                <button
                  type="button"
                  key={g}
                  onClick={() => toggleExcludedGenre(g)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-red-500 bg-red-600/20 text-red-200"
                      : "border-neutral-700 text-neutral-300 hover:border-red-700",
                  )}
                >
                  {g}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-red-900/40 bg-red-950/10 p-4">
        <Label htmlFor="excluded-tag-search" className="text-red-200">
          Never show me games tagged…
        </Label>
        <p className="text-sm text-neutral-400">
          Free-form. Add any RAWG tag you want to hide (e.g. &ldquo;Horror&rdquo;,
          &ldquo;Multiplayer&rdquo;, &ldquo;VR&rdquo;).
        </p>
        <div className="flex gap-2">
          <Input
            id="excluded-tag-search"
            type="search"
            placeholder="Add a tag to block…"
            value={excludedTagQuery}
            onChange={(e) => setExcludedTagQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customExcludedTagDraft) {
                e.preventDefault();
                addExcludedTag();
              }
            }}
          />
          {customExcludedTagDraft && (
            <Button type="button" variant="outline" onClick={addExcludedTag}>
              + Block &ldquo;{customExcludedTagDraft}&rdquo;
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {excludedTags.length === 0 ? (
            <p className="text-sm text-neutral-500">No tags blocked yet.</p>
          ) : (
            excludedTags.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => removeExcludedTag(t)}
                className="rounded-full border border-red-500 bg-red-600/20 px-3 py-1.5 text-sm text-red-200 hover:border-red-400"
                title="Click to unblock"
              >
                {t} ×
              </button>
            ))
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
