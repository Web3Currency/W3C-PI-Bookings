/** Server-driven 24h provider acceptance countdown helpers */

export function isPendingAcceptance(booking: {
  status?: string;
  escrow_status?: string;
}): boolean {
  const status = booking.status || '';
  const escrow = booking.escrow_status || '';
  // Production state after payment: Pending + paid_escrowed
  // Keep Confirmed as legacy compatibility
  return (
    escrow === 'paid_escrowed' &&
    (status === 'Pending' || status === 'Confirmed')
  );
}

export function getRemainingMs(deadlineIso?: string | null): number {
  if (!deadlineIso) return 0;
  const end = new Date(deadlineIso).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - Date.now());
}

export function isAcceptanceExpired(deadlineIso?: string | null): boolean {
  if (!deadlineIso) return false;
  return getRemainingMs(deadlineIso) <= 0;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
