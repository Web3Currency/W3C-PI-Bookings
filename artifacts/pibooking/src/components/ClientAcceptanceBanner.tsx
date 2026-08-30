import React, { useEffect, useState } from 'react';
import { Booking } from '../types';
import { isPendingAcceptance, getRemainingMs, formatCountdown, isAcceptanceExpired } from '../lib/acceptanceCountdown';
import { getProjectRemainingMs, formatProjectCountdown } from '../lib/projectTimer';
import { bookingService } from '../services/bookingService';

export function ClientAcceptanceBanner({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const [tick, setTick] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);
  void tick;

  if (booking.status === 'Delivered') {
    const confirmCompletion = async () => {
      setConfirming(true); setError('');
      try { await bookingService.updateBookingEscrowStatusAsync(booking.id, 'completion_confirmed'); window.location.reload(); }
      catch (err: any) { setError(err?.message || 'Could not confirm completion right now.'); setConfirming(false); }
    };
    if (compact) return <div className="mt-1.5 text-[10px] font-bold text-emerald-700">Delivered — awaiting your confirmation</div>;
    return <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 space-y-2">
      <div className="text-xs font-black uppercase tracking-wider text-emerald-900">Service delivered</div>
      <p className="text-sm font-bold text-emerald-950">The provider has marked this service as delivered. Review the work and confirm completion when you are satisfied.</p>
      {booking.delivered_at && <p className="text-[10px] text-zinc-500">Delivered: {new Date(booking.delivered_at).toLocaleString()}</p>}
      {booking.delivery_notes && <div className="p-3 rounded-xl bg-white/70 border border-emerald-100 text-xs text-zinc-800 whitespace-pre-wrap">{booking.delivery_notes}</div>}
      <button type="button" disabled={confirming} onClick={confirmCompletion} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-50">{confirming ? 'Confirming…' : 'Confirm Completion & Release Payment'}</button>
      {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}
    </div>;
  }

  if (booking.status === 'In Progress' && booking.project_deadline) {
    const remaining = getProjectRemainingMs(booking.project_deadline);
    const expired = remaining <= 0;
    if (compact) return <div className={`mt-1.5 text-[10px] font-bold tabular-nums ${expired ? 'text-rose-600' : 'text-blue-700'}`}>{expired ? 'Project timer expired — appeal available' : `Project time remaining: ${formatProjectCountdown(remaining)}`}</div>;
    return <div className={`p-4 rounded-2xl border space-y-1 ${expired ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className={`text-xs font-black uppercase tracking-wider ${expired ? 'text-rose-800' : 'text-blue-900'}`}>{expired ? 'Project timer expired' : 'Project in progress'}</div>
      <p className={`text-sm font-black tabular-nums ${expired ? 'text-rose-900' : 'text-blue-950'}`}>{expired ? 'The service execution window has ended.' : formatProjectCountdown(remaining) + ' remaining'}</p>
      {expired && <button type="button" disabled className="mt-2 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-black cursor-not-allowed">Appeal</button>}
      {booking.project_deadline && <p className="text-[10px] text-zinc-500">Project deadline: {new Date(booking.project_deadline).toLocaleString()}</p>}
    </div>;
  }

  if (!isPendingAcceptance(booking)) return null;
  const expired = isAcceptanceExpired(booking.acceptance_deadline);
  const remain = formatCountdown(getRemainingMs(booking.acceptance_deadline));
  if (compact) return <div className={`mt-1.5 text-[10px] font-bold tabular-nums ${expired ? 'text-rose-600' : 'text-amber-700'}`}>{expired ? 'Acceptance window expired — refund pending' : `Provider must accept within ${remain}`}</div>;
  return <div className={`p-4 rounded-2xl border space-y-1 ${expired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
    <div className={`text-xs font-black uppercase tracking-wider ${expired ? 'text-rose-800' : 'text-amber-900'}`}>{expired ? 'Provider acceptance expired' : 'Waiting for provider acceptance'}</div>
    <p className={`text-sm font-black tabular-nums ${expired ? 'text-rose-900' : 'text-amber-950'}`}>{expired ? 'Booking will cancel and your escrow refund will be initiated.' : remain + ' remaining for the provider to accept'}</p>
    {booking.acceptance_deadline && <p className="text-[10px] text-zinc-500">Deadline: {new Date(booking.acceptance_deadline).toLocaleString()}</p>}
  </div>;
}

export function clientStatusBadge(booking: Booking): { label: string; classes: string; dot: string } {
  if (isPendingAcceptance(booking)) return { label: 'Awaiting Provider', classes: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500 animate-pulse' };
  switch (booking.status) {
    case 'In Progress': return { label: 'In Progress', classes: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500 animate-pulse' };
    case 'Delivered': return { label: 'Delivered', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    case 'Confirmed': return { label: 'Confirmed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    case 'Pending': return { label: 'Pending Acceptance', classes: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500 animate-pulse' };
    case 'Completed': return { label: 'Completed', classes: 'bg-zinc-100 text-zinc-700 border-zinc-200', dot: 'bg-zinc-500' };
    case 'Cancelled': return { label: 'Cancelled', classes: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };
    default: return { label: booking.status || 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' };
  }
}
