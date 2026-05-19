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

export type InitialReview = {
  rating: number;
  gameplayRating: number | null;
  narrativeRating: number | null;
  designRating: number | null;
  gameplayNotes: string;
  narrativeNotes: string;
  designNotes: string;
  difficulty: number;
  length: (typeof LENGTHS)[number];
  platform: (typeof PLATFORMS)[number];
  playstyle: string[];
  body: string;
};

// Mirror of IN_DEPTH_NOTE_MIN_CHARS in src/lib/credits.ts. Pure constant so the
// form can show the bonus indicator without a server round-trip.
const IN_DEPTH_NOTE_MIN_CHARS = 40;
const IN_DEPTH_BONUS_CREDITS = 10;

export function LogGameForm({
  allPlaystyles,
  initialPicked = null,
  initialReview = null,
  lockGame = false,
}: {
  allPlaystyles: string[];
  initialPicked?: RawgPickedGame | null;
  initialReview?: InitialReview | null;
  lockGame?: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<RawgPickedGame | null>(initialPicked);
  const [rating, setRating] = useState(initialReview?.rating ?? 7);
  // Subscores opt-in. If any axis or note was set on a saved review we open the section by default.
  const hadSubscores =
    !!(initialReview?.gameplayRating ||
      initialReview?.narrativeRating ||
      initialReview?.designRating ||
      initialReview?.gameplayNotes ||
      initialReview?.narrativeNotes ||
      initialReview?.designNotes);
  const [showSubscores, setShowSubscores] = useState(hadSubscores);
  const [gameplay, setGameplay] = useState(initialReview?.gameplayRating ?? 7);
  const [narrative, setNarrative] = useState(initialReview?.narrativeRating ?? 7);
  const [design, setDesign] = useState(initialReview?.designRating ?? 7);
  const [gameplayNotes, setGameplayNotes] = useState(initialReview?.gameplayNotes ?? "");
  const [narrativeNotes, setNarrativeNotes] = useState(initialReview?.narrativeNotes ?? "");
  const [designNotes, setDesignNotes] = useState(initialReview?.designNotes ?? "");
  const [difficulty, setDifficulty] = useState(initialReview?.difficulty ?? 3);
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(
    initialReview?.length ?? "medium",
  );
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>(
    initialReview?.platform ?? PLATFORMS[0],
  );
  const [playstyle, setPlaystyle] = useState<string[]>(initialReview?.playstyle ?? []);
  const [playstyleQuery, setPlaystyleQuery] = useState("");
  const [body, setBody] = useState(initialReview?.body ?? "");
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
        gameplayRating: showSubscores ? gameplay : null,
        narrativeRating: showSubscores ? narrative : null,
        designRating: showSubscores ? design : null,
        gameplayNotes: showSubscores ? gameplayNotes.trim() || null : null,
        narrativeNotes: showSubscores ? narrativeNotes.trim() || null : null,
        designNotes: showSubscores ? designNotes.trim() || null : null,
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

  // Live depth-bonus check. Mirrors the server-side qualifier in
  // src/lib/credits.ts. We trim so trailing whitespace doesn't gift the bonus.
  const depthBonusEarned =
    showSubscores &&
    gameplayNotes.trim().length >= IN_DEPTH_NOTE_MIN_CHARS &&
    narrativeNotes.trim().length >= IN_DEPTH_NOTE_MIN_CHARS &&
    designNotes.trim().length >= IN_DEPTH_NOTE_MIN_CHARS;

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
            {!lockGame && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                Change
              </Button>
            )}
          </div>
        ) : (
          <GameSearch onPick={setPicked} />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating">Overall rating: {rating}/10</Label>
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

      <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Label className="text-sm">Detailed scores (optional)</Label>
            <p className="text-xs text-neutral-500">
              Break down the overall rating into gameplay, narrative, and design — and write a
              line or two about each. Fill them all out (at least {IN_DEPTH_NOTE_MIN_CHARS}{" "}
              characters per note) to earn the depth bonus.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSubscores((v) => !v)}
          >
            {showSubscores ? "Hide" : "Add"}
          </Button>
        </div>
        {showSubscores && (
          <>
            <div
              className={cn(
                "flex items-center justify-between rounded border px-3 py-2 text-xs",
                depthBonusEarned
                  ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-300"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400",
              )}
            >
              <span>
                {depthBonusEarned
                  ? `In-depth bonus unlocked: +${IN_DEPTH_BONUS_CREDITS} credits when approved.`
                  : `In-depth bonus: +${IN_DEPTH_BONUS_CREDITS} credits when all three notes hit ${IN_DEPTH_NOTE_MIN_CHARS}+ chars.`}
              </span>
              <span className="font-mono">
                {depthBonusEarned ? "✓" : "○"}
              </span>
            </div>
            <div className="space-y-5 pt-1">
              <SubscoreAxis
                id="gameplay"
                label="Gameplay"
                value={gameplay}
                onValueChange={setGameplay}
                notes={gameplayNotes}
                onNotesChange={setGameplayNotes}
                placeholder="How does it feel to actually play? Controls, pacing, difficulty curve…"
              />
              <SubscoreAxis
                id="narrative"
                label="Narrative"
                value={narrative}
                onValueChange={setNarrative}
                notes={narrativeNotes}
                onNotesChange={setNarrativeNotes}
                placeholder="Story, characters, dialogue, lore — whatever stuck with you."
              />
              <SubscoreAxis
                id="design"
                label="Design"
                value={design}
                onValueChange={setDesign}
                notes={designNotes}
                onNotesChange={setDesignNotes}
                placeholder="Art direction, sound, UI, world-building, level layout…"
              />
            </div>
          </>
        )}
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
        {pending ? "Saving…" : lockGame ? "Save edits" : "Log game"}
      </Button>
    </form>
  );
}

// One row in the detailed-scores section: a 1-10 slider plus a "explain it"
// textarea. Lives at the bottom of the file because it's purely presentational
// and the form's state lives in the parent.
function SubscoreAxis({
  id,
  label,
  value,
  onValueChange,
  notes,
  onNotesChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  placeholder: string;
}) {
  const trimmedLen = notes.trim().length;
  const meets = trimmedLen >= IN_DEPTH_NOTE_MIN_CHARS;
  return (
    <div className="space-y-2 border-l-2 border-neutral-800 pl-3">
      <Label htmlFor={id}>
        {label}: {value}/10
      </Label>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
      <Textarea
        id={`${id}-notes`}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={placeholder}
        maxLength={1000}
        rows={2}
      />
      <p
        className={cn(
          "text-xs",
          meets ? "text-emerald-400" : "text-neutral-500",
        )}
      >
        {meets
          ? `✓ ${trimmedLen} chars — counts toward bonus`
          : `${trimmedLen} / ${IN_DEPTH_NOTE_MIN_CHARS} chars needed for bonus`}
      </p>
    </div>
  );
}
