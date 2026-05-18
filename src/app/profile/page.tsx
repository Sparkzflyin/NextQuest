import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, userGenres, userPlaystyles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GENRES, PLAYSTYLES } from "@/lib/constants";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  const pickedGenres = await db.select().from(userGenres).where(eq(userGenres.userId, user.id));
  const pickedPlaystyles = await db
    .select()
    .from(userPlaystyles)
    .where(eq(userPlaystyles.userId, user.id));

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-sm text-neutral-400">Signed in as {user.email}</p>
      </div>
      <ProfileForm
        initialUsername={profile?.username ?? ""}
        initialGenres={pickedGenres.map((g) => g.genre)}
        initialPlaystyles={pickedPlaystyles.map((p) => p.playstyle)}
        allGenres={[...GENRES]}
        allPlaystyles={[...PLAYSTYLES]}
      />
    </div>
  );
}
