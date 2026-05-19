"use client";

import { useOptimistic, useTransition } from "react";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotInterested, toggleWishlist } from "./actions";

// Floats inside each FYP card. Stops propagation so clicks don't trigger the
// parent <Link>'s navigation.
export function CardActions({
  rawgId,
  initialWishlisted,
}: {
  rawgId: number;
  initialWishlisted: boolean;
}) {
  const [wishlisted, setWish] = useOptimistic(initialWishlisted, (_cur, next: boolean) => next);
  const [, start] = useTransition();

  function onWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      setWish(!wishlisted);
      await toggleWishlist({ rawgId });
    });
  }

  function onNotInterested(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Hide this game from your For You page?")) return;
    start(async () => {
      await markNotInterested({ rawgId });
    });
  }

  return (
    <div className="absolute right-2 top-2 z-20 flex gap-1">
      <button
        type="button"
        onClick={onWishlist}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={cn(
          "rounded-full bg-[#0a0c18]/85 p-1.5 backdrop-blur-sm transition-colors",
          wishlisted ? "text-rose-400" : "text-neutral-300 hover:text-rose-400",
        )}
      >
        <Heart className={cn("h-4 w-4", wishlisted && "fill-rose-400")} />
      </button>
      <button
        type="button"
        onClick={onNotInterested}
        aria-label="Not interested"
        title="Not interested — hide this from For You"
        className="rounded-full bg-[#0a0c18]/85 p-1.5 text-neutral-300 backdrop-blur-sm hover:text-red-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
