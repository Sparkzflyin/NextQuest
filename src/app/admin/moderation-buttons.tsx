"use client";

import { useState, useTransition } from "react";
import { approveReview, rejectReview } from "./actions";

export function ModerationButtons({
  reviewId,
  defaultCredits,
}: {
  reviewId: string;
  // What the review would earn if approved with no override. Drives the
  // number input's placeholder so admin knows what "blank = default" means.
  defaultCredits: number;
}) {
  const [pending, start] = useTransition();
  const [overrideText, setOverrideText] = useState("");

  function parseOverride(): number | null {
    const trimmed = overrideText.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 0 || n > 100) return null;
    return n;
  }
  const overrideInvalid = overrideText.trim().length > 0 && parseOverride() === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending || overrideInvalid}
        onClick={() =>
          start(() =>
            approveReview({ reviewId, creditOverride: parseOverride() }).then(() => {}),
          )
        }
        className="font-pixel border-2 border-emerald-500/70 px-3 py-2 text-[10px] text-emerald-300 transition-all hover:bg-emerald-950/40 hover:shadow-[0_0_12px_rgba(74,222,128,0.5)] disabled:opacity-40"
      >
        ✓ APPROVE
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => rejectReview({ reviewId }).then(() => {}))}
        className="font-pixel border-2 border-red-500/70 px-3 py-2 text-[10px] text-red-300 transition-all hover:bg-red-950/40 hover:shadow-[0_0_12px_rgba(248,113,113,0.5)] disabled:opacity-40"
      >
        ✕ REJECT
      </button>
      <label className="font-pixel ml-2 flex items-center gap-2 text-[10px] tracking-widest text-violet-300/80">
        CREDITS
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          value={overrideText}
          onChange={(e) => setOverrideText(e.target.value)}
          placeholder={String(defaultCredits)}
          className="w-16 border-2 border-violet-800/60 bg-[#0a0c18] px-2 py-1 text-center font-mono text-sm text-violet-100 focus:border-neon-violet focus:outline-none"
          title={`Default ${defaultCredits}. Leave blank to use default, or set 0–100 to override.`}
        />
      </label>
      {overrideInvalid && (
        <span className="font-terminal text-sm text-red-400">0–100 only</span>
      )}
    </div>
  );
}
