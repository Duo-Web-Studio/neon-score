import { supabase } from "@/integrations/supabase/client";

const SIGNED_TTL = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolves a stored avatar reference into a displayable URL.
 * The `avatars` bucket is private, so paths are resolved into short-lived
 * signed URLs. Legacy absolute URLs are returned as-is.
 */
export async function resolveAvatarUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  const path = value.split("?")[0];
  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;

  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_TTL - 60) * 1000 });
  return data.signedUrl;
}

export function clearAvatarUrlCache(value?: string | null) {
  if (!value) {
    cache.clear();
    return;
  }
  cache.delete(value.split("?")[0]);
}
