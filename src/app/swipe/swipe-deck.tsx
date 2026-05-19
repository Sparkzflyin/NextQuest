"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, Check, Heart, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameInfoButton } from "@/components/game-info-button";
import { cn } from "@/lib/utils";
import { fetchSwipeQueue, recordSwipe, type SwipeCard } from "./actions";

type Direction = "left" | "right" | "up" | "down";
type ActionKind = "like" | "dislike" | "wishlist" | "skip";

const DIRECTION_TO_ACTION: Record<Direction, ActionKind> = {
  right: "like",
  left: "dislike",
  up: "wishlist",
  down: "skip",
};

// Hand-rolled pointer-events gesture, no framer-motion dep. Threshold past
// which a release commits the swipe; otherwise the card snaps back to center.
const SWIPE_THRESHOLD = 90;
// When the deck shrinks to this many cards, fetch the next batch in the
// background so the user doesn't see a "queue empty" flash.
const REFETCH_AT = 3;
const REFETCH_BATCH = 10;
// Card-flight timings. EXIT_MS is also the JS slice timer, so we can't have
// the CSS transition outlast the DOM update or the new top will inherit a
// stale transition mid-flight.
const EXIT_MS = 260;
const SPRING_MS = 180;
// Snappy custom curve — accelerates fast, eases out long enough that the
// flight reads as deliberate instead of disappearing.
const EXIT_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export function SwipeDeck({
  initialCards,
  initialRemaining,
}: {
  initialCards: SwipeCard[];
  initialRemaining: number;
}) {
  const [cards, setCards] = useState<SwipeCard[]>(initialCards);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [, start] = useTransition();
  const [refetching, setRefetching] = useState(false);
  const refetchInFlight = useRef(false);

  // Drag state. transform/opacity computed at render time from these.
  // `dragging` is state (not ref) because we read it during render to decide
  // whether to apply a CSS transition (snap-back yes, live drag no).
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<Direction | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);

  const top = cards[0];
  const next = cards[1];

  const refetch = useCallback(async () => {
    if (refetchInFlight.current) return;
    refetchInFlight.current = true;
    setRefetching(true);
    try {
      const result = await fetchSwipeQueue({ count: REFETCH_BATCH });
      if (result.ok) {
        setCards((cur) => {
          const seen = new Set(cur.map((c) => c.rawgId));
          const fresh = result.cards.filter((c) => !seen.has(c.rawgId));
          return [...cur, ...fresh];
        });
      }
    } finally {
      refetchInFlight.current = false;
      setRefetching(false);
    }
  }, []);

  // User-initiated "give me a different set" — clears the visible deck and
  // pulls a fresh batch. The server-side shuffle + dedupe means the new batch
  // is genuinely different, not just a re-render of the same top-N.
  const replaceDeck = useCallback(async () => {
    if (refetchInFlight.current) return;
    refetchInFlight.current = true;
    setRefetching(true);
    setCards([]);
    try {
      const result = await fetchSwipeQueue({ count: REFETCH_BATCH });
      if (result.ok) setCards(result.cards);
    } finally {
      refetchInFlight.current = false;
      setRefetching(false);
    }
  }, []);

  useEffect(() => {
    if (cards.length <= REFETCH_AT) {
      void refetch();
    }
  }, [cards.length, refetch]);

  const commit = useCallback(
    (direction: Direction) => {
      if (!top) return;
      const action = DIRECTION_TO_ACTION[direction];
      const card = top;
      setExiting(direction);

      // Visual: swap to the next card on a fixed timer so the animation isn't
      // gated by network latency. Anything longer than EXIT_MS would be the
      // user staring at a card that has already flown off-screen.
      window.setTimeout(() => {
        setCards((cur) => cur.slice(1));
        setDragX(0);
        setDragY(0);
        setExiting(null);
      }, EXIT_MS);

      // Network in the background — UI doesn't wait.
      start(async () => {
        const res = await recordSwipe({
          rawgId: card.rawgId,
          gameId: card.gameId,
          action,
        });
        if (res.ok && action !== "skip") {
          setRemaining(Math.max(0, (res.dailyCap ?? 0) - (res.creditsUsedToday ?? 0)));
        }
      });
    },
    [top],
  );

  // Keyboard fallback so the deck is usable without touch/mouse.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!top || exiting) return;
      if (e.key === "ArrowRight") commit("right");
      else if (e.key === "ArrowLeft") commit("left");
      else if (e.key === "ArrowUp") commit("up");
      else if (e.key === "ArrowDown") commit("down");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, top, exiting]);

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return;
    startPt.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startPt.current) return;
    setDragX(e.clientX - startPt.current.x);
    setDragY(e.clientY - startPt.current.y);
  }

  function onPointerUp() {
    if (!startPt.current) return;
    startPt.current = null;
    setDragging(false);
    const absX = Math.abs(dragX);
    const absY = Math.abs(dragY);
    // Prefer the dominant axis.
    if (absX > absY && absX > SWIPE_THRESHOLD) {
      commit(dragX > 0 ? "right" : "left");
    } else if (absY > SWIPE_THRESHOLD) {
      commit(dragY < 0 ? "up" : "down");
    } else {
      // Snap back to center. Transition applies because dragging is now false.
      setDragX(0);
      setDragY(0);
    }
  }

  if (!top) {
    return (
      <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-6 text-center">
        <p className="text-sm text-neutral-400">
          {refetching ? "Loading more…" : "You've cleared the deck."}
        </p>
        {!refetching && (
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Refresh queue
          </Button>
        )}
      </div>
    );
  }

  // Compute live transform for the top card. Exit animation overrides drag.
  // Keep the function list (translate→rotate→scale) identical across every
  // state so CSS can interpolate smoothly — a mismatch in shape forces a
  // discrete swap and the animation jumps.
  const exitTransform = (() => {
    if (!exiting) return null;
    // Use viewport units so the card always clears the screen — 600px wasn't
    // enough on big monitors and was excessive on small phones.
    if (exiting === "right") return "translate(120vw, 0) rotate(24deg) scale(1)";
    if (exiting === "left") return "translate(-120vw, 0) rotate(-24deg) scale(1)";
    if (exiting === "up") return "translate(0, -120vh) rotate(0deg) scale(1)";
    return "translate(0, 120vh) rotate(0deg) scale(1)";
  })();
  const liveTransform = `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.05}deg) scale(1)`;
  const transform = exitTransform ?? liveTransform;

  // Direction overlay (Like/Hide/Wishlist/Skip) shown as user drags past a
  // small reveal threshold.
  const reveal = (() => {
    const REVEAL = 40;
    if (Math.abs(dragX) > Math.abs(dragY)) {
      if (dragX > REVEAL) return { label: "LIKE", color: "text-emerald-400 border-emerald-400" };
      if (dragX < -REVEAL) return { label: "HIDE", color: "text-red-400 border-red-400" };
    } else {
      if (dragY < -REVEAL) return { label: "WISHLIST", color: "text-rose-400 border-rose-400" };
      if (dragY > REVEAL) return { label: "SKIP", color: "text-neutral-400 border-neutral-400" };
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      <div className="relative h-[460px] select-none">
        {/* Peek behind top. Rendered FIRST so the top card's DOM order puts
            it above. Keyed by rawgId so React reconciles by card identity,
            not slot — when the array shifts, the peek's DOM node stays
            mounted and inherits the new "top" styles smoothly instead of
            unmounting and snapping the next card into place. */}
        {next && (
          <SwipeCardView
            key={next.rawgId}
            card={next}
            style={{
              // During exit, animate up to the top card's footprint so by the
              // time the slice fires there's no visual jump.
              transform: exiting
                ? "translate(0, 0) rotate(0deg) scale(1)"
                : "translate(0, 0) rotate(0deg) scale(0.96)",
              opacity: exiting ? 1 : 0.6,
              transition: `transform ${EXIT_MS}ms ${EXIT_EASE}, opacity ${EXIT_MS}ms ease-out`,
            }}
            className="absolute inset-0"
          />
        )}
        <SwipeCardView
          key={top.rawgId}
          card={top}
          interactive
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform,
            // Fade out while flying so the disappearance feels graceful
            // rather than a teleport at the end of the translate.
            opacity: exiting ? 0 : 1,
            transition: dragging
              ? "none"
              : exiting
                ? `transform ${EXIT_MS}ms ${EXIT_EASE}, opacity ${EXIT_MS - 40}ms ease-out`
                : `transform ${SPRING_MS}ms ease-out`,
            touchAction: "none",
          }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          reveal={reveal}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <ActionBtn label="Hide" color="red" onClick={() => commit("left")} disabled={!!exiting}>
          <X className="h-5 w-5" />
        </ActionBtn>
        <ActionBtn label="Skip" color="neutral" onClick={() => commit("down")} disabled={!!exiting}>
          <ArrowDown className="h-5 w-5" />
        </ActionBtn>
        <ActionBtn label="Wishlist" color="rose" onClick={() => commit("up")} disabled={!!exiting}>
          <Heart className="h-5 w-5" />
        </ActionBtn>
        <ActionBtn label="Like" color="emerald" onClick={() => commit("right")} disabled={!!exiting}>
          <Check className="h-5 w-5" />
        </ActionBtn>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
        <span>
          {cards.length} card{cards.length === 1 ? "" : "s"} left
          {refetching && " · refilling…"}
        </span>
        <button
          type="button"
          onClick={() => void replaceDeck()}
          disabled={refetching}
          className={cn(
            "font-pixel inline-flex items-center gap-1.5 border border-violet-800/60 px-2.5 py-1.5 text-[9px] tracking-widest text-violet-200",
            "transition-colors hover:border-neon-violet hover:bg-violet-950/40 hover:text-violet-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label="Refresh deck"
          title="Pull a fresh set of cards"
        >
          <RefreshCw className={cn("h-3 w-3", refetching && "animate-spin")} />
          REFRESH
        </button>
        <span>
          {remaining > 0
            ? `${remaining} credit swipe${remaining === 1 ? "" : "s"} today`
            : "credit cap hit"}
        </span>
      </div>
    </div>
  );
}

function SwipeCardView({
  card,
  reveal,
  className,
  style,
  interactive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  card: SwipeCard;
  reveal?: { label: string; color: string } | null;
  className?: string;
  style?: React.CSSProperties;
  // Only the top card is interactive; the peek card behind is decorative and
  // shouldn't show the info button (would tap through to nothing visible).
  interactive?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={style}
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-lg",
        className,
      )}
    >
      <div className="relative h-64 w-full bg-neutral-900">
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-700">
            no cover
          </div>
        )}
        {interactive && (
          <div className="absolute right-2 top-2 z-20">
            <GameInfoButton rawgId={card.rawgId} title={card.title} />
          </div>
        )}
        {reveal && (
          <div
            className={cn(
              "font-pixel pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded border-2 px-3 py-1 text-xs tracking-widest backdrop-blur-sm",
              reveal.color,
            )}
          >
            {reveal.label}
          </div>
        )}
        {card.matchScore != null && card.matchScore > 0 && (
          <div className="font-pixel absolute bottom-2 right-2 rounded border border-violet-500/70 bg-[#0a0c18]/85 px-1.5 py-0.5 text-[9px] tracking-widest text-violet-200">
            MATCH {card.matchScore}
          </div>
        )}
        {card.gameId == null && (
          <div className="font-pixel absolute bottom-2 left-2 rounded border border-cyan-500/70 bg-[#0a0c18]/85 px-1.5 py-0.5 text-[9px] tracking-widest text-neon-cyan">
            RAWG
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-lg font-semibold">{card.title}</h2>
          <span className="text-xs text-neutral-500">{card.released ?? "TBA"}</span>
        </div>
        {card.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        {card.tags.length > 0 && (
          <div className="text-xs text-neutral-500 truncate">{card.tags.slice(0, 5).join(" · ")}</div>
        )}
        {card.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-400">
            {card.description}
          </p>
        )}
        {card.gameId && (
          <Link
            href={`/games/${card.gameId}`}
            target="_blank"
            className="text-xs text-violet-400 hover:underline"
          >
            see community page ↗
          </Link>
        )}
      </div>
    </div>
  );
}

type ActionColor = "red" | "neutral" | "rose" | "emerald";
const ACTION_COLORS: Record<ActionColor, string> = {
  red: "border-red-700/60 text-red-300 hover:border-red-500 hover:bg-red-950/30",
  neutral: "border-neutral-700 text-neutral-300 hover:border-neutral-500",
  rose: "border-rose-700/60 text-rose-300 hover:border-rose-500 hover:bg-rose-950/30",
  emerald: "border-emerald-700/60 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-950/30",
};

function ActionBtn({
  label,
  color,
  onClick,
  disabled,
  children,
}: {
  label: string;
  color: ActionColor;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border-2 py-3 text-xs transition-colors disabled:opacity-40",
        ACTION_COLORS[color],
      )}
    >
      {children}
      <span className="font-pixel text-[9px] tracking-widest">{label.toUpperCase()}</span>
    </button>
  );
}
