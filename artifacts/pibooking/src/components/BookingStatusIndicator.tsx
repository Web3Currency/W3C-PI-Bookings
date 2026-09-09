import React from 'react';
import { Booking } from '../types';
import { isPendingAcceptance } from '../lib/acceptanceCountdown';

interface BookingStatusIndicatorProps {
  booking: Booking;
  className?: string;
}

export const BookingStatusIndicator: React.FC<BookingStatusIndicatorProps> = ({ booking, className = '' }) => {
  const pending = isPendingAcceptance(booking) || booking.status === 'Pending';
  const status = pending ? 'Pending' : booking.status;
  const styles: Record<string, { text: string; dot?: string }> = {
    Pending: { text: 'text-zinc-600', dot: 'bg-zinc-500' },
    'In Progress': { text: 'text-amber-600', dot: 'bg-amber-500' },
    Delivered: { text: 'text-orange-600', dot: 'bg-orange-500' },
    Completed: { text: 'text-emerald-600' },
    Cancelled: { text: 'text-rose-600' },
  };
  const style = styles[status || ''] || { text: 'text-zinc-600' };
  const pulsing = status === 'Pending' || status === 'In Progress' || status === 'Delivered';
  const label = status || 'Pending';

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold ${style.text} ${className}`}>
      {pulsing && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} animate-pulse`} aria-hidden="true" />}
      {label}
    </span>
  );
};
