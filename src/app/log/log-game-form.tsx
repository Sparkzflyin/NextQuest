"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameSearch, type RawgPickedGame } from "@/components/game-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LENGTHS, PLATFORMS } from "@/lib/constants";
import { filterTags, sanitizeTag } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { logGame } from "./actions";

export function LogGameForm({ allPlaystyles }: { allPlaystyles: string[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<RawgPickedGame | null>(null);
  const [rating, setRating] = useState(7);
  const [difficulty, setDifficulty] = useState(3);
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("medium");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>(PLATFORMS[0]);
  const [playstyle, setPlaystyle] = useState<string[]>([]);
  const [playstyleQuery, setPlaystyleQuery] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function togglePlaystyle(p: string) {
    setPlaystyle((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function addCustomPlaystyle() {
    const clean = sanitizeTag(playstyleQuery);
    if (!clean) return;
    const existing = [...allPlaystyles, ...playstyle].find(
      (t) => t.toLowerCase() === clean.toLowerCase(),
    );
    const tag = existing ?? clean;
    setPlaystyle((cur) => (cur.includes(tag) ? cur : [...cur, tag]));
    setPlaystyleQuery("");
  }

  // Merge canonical + currently-selected so custom user-added playstyles render
  // as highlighted chips alongside the canonical 12, not just held silently in state.
  const playstyleOptions = Array.from(new Set([...allPlaystyles, ...playstyle])).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  const visiblePlaystyles = filterTags(playstyleOptions, playstyle, playstyleQuery);
  const customTagDraft = (() => {
    const clean = sanitizeTag(playstyleQuery);
    if (!clean) return null;
    const exists = playstyleOptions.some((t) => t.toLowerCase() === clean.toLowerCase());
    return exists ? null : clean;
  })();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!picked) return setError("Pick a game first.");
    start(async () => {
      const result = await logGame({
        rawgId: picked.rawgId,
        rating,
        difficulty,
        length,
        platform,
        playstyle,
        body: body.trim() || null,
      });
      if (!result.ok) return setError(result.error ?? "Could not save your log.");
      router.push(`/games/${result.gameId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label>Game</Label>
        {picked ? (
          <div className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3">
            {picked.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picked.coverUrl} alt="" className="h-14 w-20 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{picked.title}</div>
              <div className="truncate text-xs text-neutral-500">
                {picked.released ?? "—"} · {picked.genres.join(", ")}
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
              Change
            </Button>
          </div>
        ) : (
          <GameSearch onPick={setPicked} />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating">Rating: {rating}/10</Label>
        <input
          id="rating"
          type="range"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty: {difficulty}/5</Label>
          <input
            id="difficulty"
            type="range"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="length">Length</Label>
          <Select
            id="length"
            value={length}
            onChange={(e) => setLength(e.target.value as (typeof LENGTHS)[number])}
          >
            {LENGTHS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform">Platform played on</Label>
        <Select
          id="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="playstyle-search">Playstyle tags</Label>
        <p className="text-sm text-neutral-400">
          Search or add your own. New tags become a permanent option once enough reviewers use them.
        </p>
        <div className="flex gap-2">
          <Input
            id="playstyle-search"
            type="search"
            placeholder="Search or add a tag…"
            value={playstyleQuery}
            onChange={(e) => setPlaystyleQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customTagDraft) {
                e.preventDefault();
                addCustomPlaystyle();
              }
            }}
          />
          {customTagDraft && (
            <Button type="button" variant="outline" onClick={addCustomPlaystyle}>
              + Add &ldquo;{customTagDraft}&rdquo;
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {visiblePlaystyles.length === 0 && !customTagDraft ? (
            <p className="text-sm text-neutral-500">
              No matches for &ldquo;{playstyleQuery}&rdquo;.
            </p>
          ) : (
            visiblePlaystyles.map((p) => {
              const active = playstyle.includes(p);
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => togglePlaystyle(p)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
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

      <div className="space-y-2">
        <Label htmlFor="body">Thoughts (optional)</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What stood out to you about it?"
          maxLength={2000}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Log game"}
      </Button>
    </form>
  );
}
