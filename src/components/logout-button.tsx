"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/");
      }}
      className="font-terminal text-lg text-violet-400 hover:text-neon-cyan"
    >
      Log out
    </button>
  );
}
