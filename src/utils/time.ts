/**
 * Utility functions for formatting raw dates and timestamps into human-readable relative formats
 * (e.g., 'just now', '2m ago', '1h ago', '3d ago', '1w ago', etc.)
 */

export type TimestampInput =
  | number
  | string
  | Date
  | { seconds: number; nanoseconds?: number }
  | { toMillis?: () => number }
  | null
  | undefined;

/**
 * Converts any timestamp or date representation into milliseconds since Unix epoch.
 */
export function parseTimestampToMs(input: TimestampInput): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  // Handle Firestore Timestamp object or Date object
  if (typeof input === 'object') {
    if (input instanceof Date) {
      const ms = input.getTime();
      return isNaN(ms) ? null : ms;
    }
    if (typeof (input as any).toMillis === 'function') {
      try {
        return (input as any).toMillis();
      } catch {
        return null;
      }
    }
    if (typeof (input as any).seconds === 'number') {
      const nanos = typeof (input as any).nanoseconds === 'number' ? (input as any).nanoseconds : 0;
      return (input as any).seconds * 1000 + Math.floor(nanos / 1000000);
    }
  }

  // Handle numeric timestamp (e.g. Date.now() or Unix seconds)
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return null;
    // If it's less than 10 billion, it's likely in seconds rather than milliseconds
    if (input > 0 && input < 10000000000) {
      return input * 1000;
    }
    return input;
  }

  // Handle string input
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if it's a numeric string (e.g. '1729388200000')
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num) && /^\d+$/.test(trimmed)) {
      if (num > 0 && num < 10000000000) {
        return num * 1000;
      }
      return num;
    }

    // Try parsing as ISO or Date string
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

/**
 * Formats a raw timestamp (number, string, Date, Firestore Timestamp)
 * into a concise human-readable relative timestamp:
 * - < 60s: 'just now'
 * - < 60m: '2m ago'
 * - < 24h: '1h ago'
 * - < 7d: '3d ago'
 * - < 4w: '2w ago'
 * - < 12mo: '5mo ago'
 * - >= 1y: '1y ago'
 */
export function formatRelativeTime(
  timestamp: TimestampInput,
  options?: { fallback?: string; now?: number }
): string {
  const fallback = options?.fallback ?? 'recently';

  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return fallback;
  }

  // If input is a string that is already human relative (e.g. 'Just now', '2m ago', '1h ago', '3d ago')
  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (/^(just now|now|\d+[smhdw]\s*ago|\d+mo\s*ago|\d+y\s*ago)$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }

  const ms = parseTimestampToMs(timestamp);
  if (ms === null) {
    // If string is already descriptive (e.g. 'Yesterday', 'Today')
    if (typeof timestamp === 'string' && timestamp.trim()) {
      return timestamp.trim();
    }
    return fallback;
  }

  const now = options?.now ?? Date.now();
  const diffSeconds = Math.floor((now - ms) / 1000);

  // If clock skew or future by a few seconds
  if (diffSeconds < 60) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

// Aliases for convenience
export const formatTime = formatRelativeTime;
export const getRelativeTime = formatRelativeTime;
export const timeAgo = formatRelativeTime;
