"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameSearch, type RawgPickedGame } from "@/components/game-search";
import { Button } from "@/components/ui/button";
import { addCurrentlyPlaying, removeCurrentlyPlaying } from "./actions";

export type CurrentlyPlayingItem = {
  gameId: string;
  title: string;
  coverUrl: string | null;
  startedAt: string;
};

export function CurrentlyPlayingSection({
  initialItems,
}: {
  initialItems: CurrentlyPlayingItem[];
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(g: RawgPickedGame) {
    setError(null);
    start(async () => {
      const result = await addCurrentlyPlaying({ rawgId: g.rawgId });
      if (!result.ok) {
        setError(result.error ?? "Could not add game.");
        return;
      }
      setPicking(false);
      router.refresh();
    });
  }

  function onRemove(gameId: string) {
    setError(null);
    start(async () => {
      const result = await removeCurrentlyPlaying({ gameId });
      if (!result.ok) {
        setError(result.error ?? "Could not remove game.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Currently playing</h2>
        {!picking && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPicking(true)}
            disabled={pending}
          >
            + Add a game
          </Button>
        )}
      </div>

      {picking && (
        <div className="space-y-2 rounded-md border border-violet-800/40 bg-neutral-950/50 p-3">
          <GameSearch onPick={onPick} />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPicking(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {initialItems.length === 0 && !picking ? (
        <p className="text-sm text-neutral-500">
          Nothing on your active quest log. Add a game you&apos;re working through.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {initialItems.map((item) => (
            <li
              key={item.gameId}
              className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3"
            >
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.coverUrl}
                  alt=""
                  className="h-12 w-16 flex-shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-16 flex-shrink-0 rounded bg-neutral-800" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/games/${item.gameId}`}
                  className="truncate font-medium text-violet-100 hover:text-neon-cyan"
                >
                  {item.title}
                </Link>
                <div className="text-xs text-neutral-500">
                  started {new Date(item.startedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.gameId)}
                disabled={pending}
                className="text-xs text-neutral-500 hover:text-red-400"
                title="Remove from currently playing"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
