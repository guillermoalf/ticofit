/**
 * YouTubeEmbed — reusable 16:9 responsive YouTube iframe.
 *
 * Props:
 *   url      A youtube_url stored in the exercises table (any valid YouTube
 *            format: watch, youtu.be, or embed). Mutually exclusive with videoId.
 *   videoId  An already-extracted YouTube video id (e.g. "dQw4w9WgXcQ").
 *   title    Accessible iframe title (default: "Video de YouTube").
 *
 * Returns null when neither prop resolves to a valid video id.
 */
export function YouTubeEmbed({
  url,
  videoId: rawId,
  title = "Video de YouTube",
}: {
  url?: string | null;
  videoId?: string | null;
  title?: string;
}) {
  const id = rawId ?? (url ? extractYouTubeId(url) : null);
  if (!id) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black pb-[56.25%]">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}

/**
 * Extracts the YouTube video id from any standard YouTube URL format.
 * Accepts watch URLs, youtu.be short links, and /embed/ URLs.
 * Tolerates missing protocol (e.g. "youtube.com/watch?v=…").
 * Returns null for anything that isn't a recognizable YouTube link.
 */
export function extractYouTubeId(url: string): string | null {
  try {
    let raw = url.trim();
    // Allow pasting without the https:// prefix
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return isValidId(id) ? id : null;
    }

    if (host === "youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/")[2];
        return isValidId(id) ? id : null;
      }
      if (u.pathname === "/watch" || u.pathname.startsWith("/watch")) {
        const id = u.searchParams.get("v");
        return id && isValidId(id) ? id : null;
      }
      // Handle /shorts/VIDEO_ID
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return isValidId(id) ? id : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/** YouTube video ids are 11 characters of [A-Za-z0-9_-]. */
function isValidId(id: string | undefined): id is string {
  return Boolean(id && /^[A-Za-z0-9_-]{11}$/.test(id));
}
