import { IN_DEPTH_NOTE_MIN_CHARS } from "./credits";

// Shape required to decide whether a review qualifies for the "In-depth" badge
// + the +10 credit bonus. Same fields that drive the SQL in credits.ts so the
// two stay in lockstep.
export type InDepthCheckable = {
  gameplayRating: number | null;
  narrativeRating: number | null;
  designRating: number | null;
  gameplayNotes: string | null;
  narrativeNotes: string | null;
  designNotes: string | null;
};

export function isInDepthReview(r: InDepthCheckable): boolean {
  return (
    r.gameplayRating != null &&
    r.narrativeRating != null &&
    r.designRating != null &&
    (r.gameplayNotes?.trim().length ?? 0) >= IN_DEPTH_NOTE_MIN_CHARS &&
    (r.narrativeNotes?.trim().length ?? 0) >= IN_DEPTH_NOTE_MIN_CHARS &&
    (r.designNotes?.trim().length ?? 0) >= IN_DEPTH_NOTE_MIN_CHARS
  );
}
