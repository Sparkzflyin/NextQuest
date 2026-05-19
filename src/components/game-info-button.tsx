"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchGameDescription } from "@/app/recommendations/actions";

type Props = {
  rawgId: number;
  title: string;
  // Pixel-style cards (swipe + FYP) sit inside <Link>/swipe-gesture surfaces.
  // The trigger button needs preventDefault+stopPropagation in those cases.
  // The button itself does this; consumers don't need to wrap.
  className?: string;
};

// Tap-to-load description modal. Single fetch per game (cached after first
// open). The button stops event propagation so taps don't trigger the parent
// Link nav or swipe gesture.
export function GameInfoButton({ rawgId, title, className }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedFor = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (fetchedFor.current === rawgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGameDescription({ rawgId });
      if (res.ok) {
        setDescription(res.description ?? "");
        fetchedFor.current = rawgId;
      } else {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }, [rawgId]);

  const onOpen = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    void load();
  };

  const onClose = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(false);
  };

  // Escape-to-close, and lock body scroll while the modal is open so the
  // card grid behind doesn't scroll under the user's finger on mobile.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="More info about this game"
        title="More info"
        className={cn(
          "rounded-full bg-[#0a0c18]/85 p-1.5 text-neutral-300 backdrop-blur-sm transition-colors hover:text-neon-cyan",
          className,
        )}
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
          <div
            role="dialog"
            aria-modal
            aria-label={`${title} — description`}
            className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden border-2 border-violet-800/70 bg-[#0a0c18] shadow-[0_0_24px_rgba(192,132,252,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-violet-900/60 px-4 py-3">
              <h2 className="font-pixel text-xs tracking-widest text-violet-100">
                {title.toUpperCase()}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded p-1 text-neutral-400 transition-colors hover:bg-violet-950/40 hover:text-neon-cyan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 text-sm text-neutral-200">
              {loading && (
                <p className="text-neutral-400">Loading description…</p>
              )}
              {!loading && error && (
                <p className="text-red-400">{error}</p>
              )}
              {!loading && !error && description !== null && (
                description.trim().length > 0 ? (
                  // RAWG paragraphs are double-newline separated. Render each
                  // as its own block so the formatting holds up.
                  description
                    .trim()
                    .split(/\n{2,}/)
                    .map((p, i) => (
                      <p key={i} className="mb-3 last:mb-0 whitespace-pre-line">
                        {p}
                      </p>
                    ))
                ) : (
                  <p className="text-neutral-500">No description available for this game.</p>
                )
              )}
            </div>
            <div className="border-t border-violet-900/60 px-4 py-2 text-right">
              <span className="font-pixel text-[9px] tracking-widest text-violet-500">
                VIA RAWG
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
