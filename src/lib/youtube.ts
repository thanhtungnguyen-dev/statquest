const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

export function isYouTubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID.test(value);
}

export function parseYouTubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    let candidate: string | null = null;
    const hostname = url.hostname.toLocaleLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be") {
      candidate = segments[0] ?? null;
    } else if (YOUTUBE_HOSTS.has(hostname)) {
      if (url.pathname === "/watch") {
        candidate = url.searchParams.get("v");
      } else if (segments[0] === "shorts") {
        candidate = segments[1] ?? null;
      }
    }

    return candidate && isYouTubeVideoId(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function youtubePrivacyEmbedUrl(videoId: string): string | null {
  return isYouTubeVideoId(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;
}
