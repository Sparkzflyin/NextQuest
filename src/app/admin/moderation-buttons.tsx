"use client";

import { useTransition } from "react";
import { approveReview, rejectReview } from "./actions";

export function ModerationButtons({ reviewId }: { reviewId: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => approveReview({ reviewId }).then(() => {}))}
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
    </div>
  );
}
