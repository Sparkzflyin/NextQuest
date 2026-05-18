"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { vote } from "@/app/games/actions";
import { cn } from "@/lib/utils";

type State = { score: number; myVote: -1 | 0 | 1 };

export function VoteButtons({
  gameId,
  initialScore,
  initialMyVote,
  signedIn,
}: {
  gameId: string;
  initialScore: number;
  initialMyVote: -1 | 0 | 1;
  signedIn: boolean;
}) {
  const [state, setOptimistic] = useOptimistic<State, -1 | 1>(
    { score: initialScore, myVote: initialMyVote },
    (cur, nextValue) => {
      const newVote: -1 | 0 | 1 = cur.myVote === nextValue ? 0 : nextValue;
      const delta = newVote - cur.myVote;
      return { score: cur.score + delta, myVote: newVote };
    },
  );
  const [, start] = useTransition();

  function cast(value: -1 | 1) {
    if (!signedIn) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    start(async () => {
      setOptimistic(value);
      await vote({ gameId, value });
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Upvote"
        onClick={() => cast(1)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-md hover:bg-neutral-800",
          state.myVote === 1 && "text-emerald-400",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
      <span
        className={cn(
          "min-w-8 text-center font-mono text-sm tabular-nums",
          state.score > 0 && "text-emerald-400",
          state.score < 0 && "text-red-400",
        )}
      >
        {state.score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={() => cast(-1)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-md hover:bg-neutral-800",
          state.myVote === -1 && "text-red-400",
        )}
      >
        <ArrowDown className="h-5 w-5" />
      </button>
    </div>
  );
}
