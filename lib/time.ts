import { TimestampValue } from '@/types/post';

export function toMillis(value: TimestampValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.seconds === 'number') {
      return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1000000);
    }
  }

  return null;
}

export function formatRelativeTime(value: TimestampValue, fallback = 'Recently'): string {
  const millis = toMillis(value);
  if (!millis) {
    return fallback;
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - millis) / 1000));

  if (diffSeconds < 30) return 'now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
