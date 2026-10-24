/**
 * YouTube Utility Helpers for YouTube Watch Together
 * Official YouTube URL parsing, video ID extraction, and embeddable metadata validation
 */

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  authorName?: string;
  isEmbeddable: boolean;
}

/**
 * Extracts a valid 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - Raw video ID: dQw4w9WgXcQ
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for YouTube URLs
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates official high-quality YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Fetches public video title and metadata using YouTube's standard oEmbed endpoint
 * (Requires no private API keys; validates if video is embeddable)
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnail = getYouTubeThumbnailUrl(videoId);

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(oembedUrl);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('This video cannot be embedded due to owner playback restrictions.');
      }
      if (res.status === 404) {
        throw new Error('Video not found. Please verify the link.');
      }
      return {
        videoId,
        title: `YouTube Video (${videoId})`,
        thumbnail,
        isEmbeddable: true,
      };
    }

    const data = await res.json();
    return {
      videoId,
      title: data.title || `YouTube Video (${videoId})`,
      thumbnail: data.thumbnail_url || thumbnail,
      authorName: data.author_name,
      isEmbeddable: true,
    };
  } catch (err: any) {
    // If oEmbed fails (e.g. CORS on some networks), return fallback with thumbnail
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      thumbnail,
      isEmbeddable: true,
    };
  }
}

/**
 * Loads the official YouTube IFrame Player API script tag once
 */
let isApiLoading = false;
let apiLoadedPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }

  if (apiLoadedPromise) {
    return apiLoadedPromise;
  }

  apiLoadedPromise = new Promise((resolve) => {
    // Check if script already exists in DOM
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousOnReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') previousOnReady();
      resolve();
    };

    // Fallback polling in case callback already fired
    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 8000);
  });

  return apiLoadedPromise;
}
