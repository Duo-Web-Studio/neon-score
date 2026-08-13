import { useEffect, useState, type ReactNode } from "react";
import { resolveAvatarUrl } from "@/lib/avatarUrl";

interface Props {
  /** Storage path (private bucket) or legacy absolute URL. */
  value: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
}

/**
 * Renders an avatar stored in the private `avatars` bucket by resolving
 * a short-lived signed URL. Falls back to the provided node when missing.
 */
export function AvatarImage({ value, alt, className, fallback }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    resolveAvatarUrl(value).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [value]);

  if (!url) return <>{fallback}</>;
  return <img src={url} alt={alt} className={className} />;
}
