"use client";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.assign("/");
      }}
      className="font-terminal text-lg text-violet-400 hover:text-neon-cyan"
    >
      Log out
    </button>
  );
}
