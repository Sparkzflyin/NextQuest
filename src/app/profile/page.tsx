import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, userGenres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GENRES } from "@/lib/constants";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  const picked = await db.select().from(userGenres).where(eq(userGenres.userId, user.id));

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-sm text-neutral-400">Signed in as {user.email}</p>
      </div>
      <ProfileForm
        initialUsername={profile?.username ?? ""}
        initialGenres={picked.map((g) => g.genre)}
        allGenres={[...GENRES]}
      />
    </div>
  );
}
