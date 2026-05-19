"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshFeedButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className={cn(
        "font-pixel inline-flex items-center gap-2 border-2 border-violet-800/60 px-3 py-2 text-[10px] tracking-widest text-violet-200",
        "transition-colors hover:border-neon-violet hover:bg-violet-950/40 hover:text-violet-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
      aria-label="Refresh feed"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
      {pending ? "REFRESHING…" : "REFRESH"}
    </button>
  );
}
