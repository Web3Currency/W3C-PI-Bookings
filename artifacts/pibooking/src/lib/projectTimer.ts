export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export const DURATION_LIMITS: Record<DurationUnit, number> = {
  minutes: 59,
  hours: 24,
  days: 30,
  weeks: 4,
  months: 12,
};

export function durationToMinutes(value: number, unit: DurationUnit): number {
  const safe = Math.max(1, Math.min(DURATION_LIMITS[unit], Math.floor(value)));
  const multipliers: Record<DurationUnit, number> = {
    minutes: 1,
    hours: 60,
    days: 24 * 60,
    weeks: 7 * 24 * 60,
    months: 30 * 24 * 60,
  };
  return safe * multipliers[unit];
}

export function formatDuration(value: number, unit: DurationUnit): string {
  const safe = Math.max(1, Math.floor(value));
  return `${safe} ${unit.replace(/s$/, '')}${safe === 1 ? '' : 's'}`;
}

export function getProjectRemainingMs(deadline?: string | null): number {
  if (!deadline) return 0;
  const ms = new Date(deadline).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : 0;
}

export function formatProjectCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
