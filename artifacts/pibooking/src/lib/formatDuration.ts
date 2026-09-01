import { DurationUnit } from '../types';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const MINUTES_PER_MONTH = 4 * MINUTES_PER_WEEK;
const MINUTES_PER_YEAR = 12 * MINUTES_PER_MONTH;

/**
 * Formats stored service durations for people instead of exposing raw minutes.
 * The stored duration is unchanged; this helper is display-only.
 */
export function formatDuration(durationMinutes: number, value?: number, unit?: DurationUnit): string {
  const minutes = Math.max(0, Math.round(Number(durationMinutes) || 0));
  if (minutes === 0) return 'Not specified';

  if (unit && value && value > 0) {
    const normalized = String(unit).toLowerCase() as DurationUnit;
    if (normalized === 'months' && value % 12 === 0) return `${value / 12} ${value / 12 === 1 ? 'year' : 'years'}`;
    if (normalized === 'weeks' && value % 4 === 0) return `${value / 4} ${value / 4 === 1 ? 'month' : 'months'}`;
    if (normalized === 'minutes' && value % 60 === 0) return `${value / 60} ${value / 60 === 1 ? 'hour' : 'hours'}`;
    if (normalized === 'hours' && value % 24 === 0) return `${value / 24} ${value / 24 === 1 ? 'day' : 'days'}`;
    return `${value} ${value === 1 ? normalized.slice(0, -1) : normalized}`;
  }

  if (minutes % MINUTES_PER_YEAR === 0) {
    const years = minutes / MINUTES_PER_YEAR;
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  if (minutes % MINUTES_PER_MONTH === 0) {
    const months = minutes / MINUTES_PER_MONTH;
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  if (minutes % MINUTES_PER_WEEK === 0) {
    const weeks = minutes / MINUTES_PER_WEEK;
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  if (minutes % MINUTES_PER_DAY === 0) {
    const days = minutes / MINUTES_PER_DAY;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (minutes % MINUTES_PER_HOUR === 0) {
    const hours = minutes / MINUTES_PER_HOUR;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remainingMinutes = minutes % MINUTES_PER_HOUR;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
