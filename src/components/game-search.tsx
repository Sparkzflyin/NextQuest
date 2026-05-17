"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export type RawgPickedGame = {
  rawgId: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  released: string | null;
  genres: string[];
};

export function GameSearch({
  onPick,
}: {
  onPick: (g: RawgPickedGame) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RawgPickedGame[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rawg/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Search for a game…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {(loading || results.length > 0) && (
        <ul className="max-h-72 overflow-auto rounded-md border border-neutral-800 bg-neutral-950">
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-500">Searching…</li>
          )}
          {results.map((g) => (
            <li key={g.rawgId}>
              <button
                type="button"
                onClick={() => {
                  onPick(g);
                  setQ("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-900"
              >
                {g.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.coverUrl}
                    alt=""
                    className="h-10 w-16 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-16 flex-shrink-0 rounded bg-neutral-800" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{g.title}</div>
                  <div className="truncate text-xs text-neutral-500">
                    {g.released ?? "—"} · {g.genres.join(", ") || "no genres"}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
