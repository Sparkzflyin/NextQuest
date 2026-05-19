"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

// Owner-only avatar upload. File goes to Supabase Storage at "<user_id>/avatar"
// (upsert overwrites), then we write the public URL to profiles.avatar_url so
// it can be rendered without a storage call on read paths.
export function AvatarUpload({
  userId,
  currentAvatarUrl,
  username,
}: {
  userId: string;
  currentAvatarUrl: string | null;
  username: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Browsers cache the public URL aggressively; after an upload we append a
  // ?v=<ts> so the new image actually appears without a hard refresh.
  const [bust, setBust] = useState<number | null>(null);

  const displayUrl = currentAvatarUrl
    ? bust
      ? `${currentAvatarUrl}?v=${bust}`
      : currentAvatarUrl
    : null;

  async function onChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Image must be 2 MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }

    setBust(Date.now());
    setUploading(false);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onRemove() {
    if (!currentAvatarUrl) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    // Try to delete the storage object, but don't fail the whole flow if it's
    // already gone — what matters is clearing the column so the UI updates.
    await supabase.storage.from("avatars").remove([`${userId}/avatar`]);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }
    setBust(null);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-violet-800/60 bg-neutral-900">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="font-pixel flex h-full w-full items-center justify-center text-2xl text-violet-300/70">
            {(username || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? "Uploading…"
              : currentAvatarUrl
                ? "Replace avatar"
                : "Upload avatar"}
          </Button>
          {currentAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={uploading}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-neutral-500">PNG, JPG, WebP, or GIF · 2 MB max.</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onChoose}
      />
    </div>
  );
}
