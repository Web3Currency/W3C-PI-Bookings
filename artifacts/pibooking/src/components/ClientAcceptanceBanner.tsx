import React, { useEffect, useState } from 'react';
import { Booking } from '../types';
import { isPendingAcceptance, getRemainingMs, formatCountdown, isAcceptanceExpired } from '../lib/acceptanceCountdown';
import { getProjectRemainingMs, formatProjectCountdown } from '../lib/projectTimer';
import { bookingService } from '../services/bookingService';
import { Check, MessageSquare, AlertTriangle } from 'lucide-react';

export function ClientAcceptanceBanner({ booking, compact = false, onOpenChat }: { booking: Booking; compact?: boolean; onOpenChat?: (bookingId: string) => void }) {
  const [tick, setTick] = useState(0); const [confirming, setConfirming] = useState(false); const [revising, setRevising] = useState(false); const [error, setError] = useState('');
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []); void tick;

  if (booking.status === 'Delivered') {
    const confirmCompletion = async () => { setConfirming(true); setError(''); try { await bookingService.updateBookingEscrowStatusAsync(booking.id, 'completion_confirmed'); window.location.reload(); } catch (err: any) { setError(err?.message || 'Could not confirm completion right now.'); setConfirming(false); } };
    const requestRevision = async () => { setRevising(true); setError(''); try { await bookingService.requestRevisionAsync(booking.id); if (onOpenChat) { onOpenChat(booking.id); } else { sessionStorage.setItem('w3c_open_chat_booking', booking.id); window.dispatchEvent(new CustomEvent('w3c-open-chat-booking', { detail: { bookingId: booking.id } })); } } catch (err: any) { setError(err?.message || 'Could not request a revision right now.'); setRevising(false); } };
    const appeal = () => { setError('Appeal submission will be available once the W3C review process is connected.'); };
    if (compact) return null;
    const hasRevisionAlready = Number(booking.revision_count || 0) > 0;
    return <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 space-y-2"><div className="flex flex-wrap items-center gap-2">{hasRevisionAlready ? <button type="button" onClick={appeal} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"><AlertTriangle className="w-3.5 h-3.5" />Appeal</button> : <button type="button" onClick={requestRevision} disabled={revising || confirming} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black disabled:opacity-50"><MessageSquare className="w-3.5 h-3.5" />{revising ? 'Opening…' : 'Request Revision'}</button>}<button type="button" disabled={confirming || revising} onClick={confirmCompletion} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-50"><Check className="w-3.5 h-3.5" />{confirming ? 'Confirming…' : 'Confirm Completion'}</button></div>{error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}</div>;
  }

  if (booking.status === 'In Progress' && booking.project_deadline) {
    const remaining = getProjectRemainingMs(booking.project_deadline); const expired = remaining <= 0;
    if (compact) return <BookingStatusCompact timer={expired ? 'Expired' : formatProjectCountdown(remaining)} timerLabel="Service time" timerTone={expired ? 'text-rose-600' : 'text-zinc-600'} />;
    return <div className={`p-4 rounded-2xl border space-y-1 ${expired ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}><div className={`text-xs font-black uppercase tracking-wider ${expired ? 'text-rose-800' : 'text-blue-900'}`}>{expired ? 'Project timer expired' : 'Project in progress'}</div><p className={`text-sm font-black tabular-nums ${expired ? 'text-rose-900' : 'text-blue-950'}`}>{expired ? 'The service execution window has ended.' : formatProjectCountdown(remaining) + ' remaining'}</p>{expired && <button type="button" disabled className="mt-2 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-black cursor-not-allowed">Appeal</button>}{booking.project_deadline && <p className="text-[10px] text-zinc-500">Project deadline: {new Date(booking.project_deadline).toLocaleString()}</p>}</div>;
  }

  if (!isPendingAcceptance(booking)) return null;
  const expired = isAcceptanceExpired(booking.acceptance_deadline); const remain = formatCountdown(getRemainingMs(booking.acceptance_deadline));
  if (compact) return <BookingStatusCompact timer={expired ? 'Expired' : remain} timerLabel="Acceptance" timerTone={expired ? 'text-rose-600' : 'text-zinc-600'} />;
  return <div className={`p-4 rounded-2xl border space-y-1 ${expired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}><div className={`text-xs font-black uppercase tracking-wider ${expired ? 'text-rose-800' : 'text-amber-900'}`}>{expired ? 'Provider acceptance expired' : 'Waiting for provider acceptance'}</div><p className={`text-sm font-black tabular-nums ${expired ? 'text-rose-900' : 'text-amber-950'}`}>{expired ? 'Booking will cancel and your escrow refund will be initiated.' : remain + ' remaining for the provider to accept'}</p>{booking.acceptance_deadline && <p className="text-[10px] text-zinc-500">Deadline: {new Date(booking.acceptance_deadline).toLocaleString()}</p>}</div>;
}

function BookingStatusCompact({ timer, timerLabel, timerTone }: { timer?: string; timerLabel?: string; timerTone?: string }) {
  if (!timer) return null;
  return <div className="flex items-center justify-center leading-none"><span className={`inline-flex items-center gap-1.5 text-center ${timerTone || 'text-zinc-600'}`}><span className="text-[9px] font-black tracking-wide opacity-70">{timerLabel}</span><span className="text-[11px] font-black tabular-nums">{timer}</span></span></div>;
}

export function clientStatusBadge(booking: Booking): { label: string; classes: string; dot: string } {
  if (isPendingAcceptance(booking)) return { label: 'Pending', classes: 'text-zinc-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: 'bg-zinc-500 animate-pulse' };
  switch (booking.status) {
    case 'In Progress': return { label: 'In Progress', classes: 'text-amber-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: 'bg-amber-500 animate-pulse' };
    case 'Delivered': return { label: 'Delivered', classes: 'text-orange-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: 'bg-orange-500 animate-pulse' };
    case 'Confirmed': return { label: 'Confirmed', classes: 'text-zinc-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: '' };
    case 'Pending': return { label: 'Pending', classes: 'text-zinc-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: 'bg-zinc-500 animate-pulse' };
    case 'Completed': return { label: 'Completed', classes: 'text-emerald-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: '' };
    case 'Cancelled': return { label: 'Cancelled', classes: 'text-rose-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: '' };
    default: return { label: booking.status || 'Pending', classes: 'text-zinc-600 !bg-transparent !border-0 !px-0 !py-0 !rounded-none', dot: '' };
  }
}
