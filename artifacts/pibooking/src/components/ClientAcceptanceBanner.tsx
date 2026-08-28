import React, { useEffect, useState } from 'react';
import { Booking } from '../types';
import { isPendingAcceptance, getRemainingMs, formatCountdown, isAcceptanceExpired } from '../lib/acceptanceCountdown';

export function ClientAcceptanceBanner({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;
  if (!isPendingAcceptance(booking)) return null;
  const expired = isAcceptanceExpired(booking.acceptance_deadline);
  const remain = formatCountdown(getRemainingMs(booking.acceptance_deadline));
  if (compact) {
    return (
      <div className={`mt-1.5 text-[10px] font-bold tabular-nums ${expired ? 'text-rose-600' : 'text-amber-700'}`}>
        {expired ? 'Acceptance window expired — refund pending' : `Provider must accept within ${remain}`}
      </div>
    );
  }
  return (
    <div className={`p-4 rounded-2xl border space-y-1 ${expired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`text-xs font-black uppercase tracking-wider ${expired ? 'text-rose-800' : 'text-amber-900'}`}>
        {expired ? 'Provider acceptance expired' : 'Waiting for provider acceptance'}
      </div>
      <p className={`text-sm font-black tabular-nums ${expired ? 'text-rose-900' : 'text-amber-950'}`}>
        {expired ? 'Booking will cancel and your escrow refund will be initiated.' : remain + ' remaining for the provider to accept'}
      </p>
      {booking.acceptance_deadline && (
        <p className="text-[10px] text-zinc-500">Deadline: {new Date(booking.acceptance_deadline).toLocaleString()}</p>
      )}
    </div>
  );
}

export function clientStatusBadge(booking: Booking): { label: string; classes: string; dot: string } {
  if (isPendingAcceptance(booking)) {
    return { label: 'Awaiting Provider', classes: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500 animate-pulse' };
  }
  switch (booking.status) {
    case 'In Progress':
      return { label: 'In Progress', classes: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500 animate-pulse' };
    case 'Confirmed':
      return { label: 'Confirmed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    case 'Pending':
      return { label: 'Pending Acceptance', classes: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500 animate-pulse' };
    case 'Completed':
      return { label: 'Completed', classes: 'bg-zinc-100 text-zinc-700 border-zinc-200', dot: 'bg-zinc-500' };
    case 'Cancelled':
      return { label: 'Cancelled', classes: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };
    default:
      return { label: booking.status || 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' };
  }
}
