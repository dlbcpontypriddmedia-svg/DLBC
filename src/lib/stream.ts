export const AUDIO_STREAM_URL = 'https://airtime.dclm.org/radio/8000/live';

export type StreamMode = 'audio' | 'video';

export function getStreamModeKey(streamSessionId?: string) {
  return streamSessionId ? `dlbc_stream_mode:${streamSessionId}` : null;
}

export function formatStreamTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getVideoId(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const watchId = parsed.searchParams.get('v');
      if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) {
        return watchId;
      }

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const candidate = pathParts[pathParts.length - 1];
      if (
        ['embed', 'live', 'shorts'].includes(pathParts[0] || '') &&
        candidate &&
        /^[a-zA-Z0-9_-]{11}$/.test(candidate)
      ) {
        return candidate;
      }
    }
  } catch {
    // Fall through to regex fallback for malformed-but-usable input.
  }

  const match = trimmed.match(/([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}
