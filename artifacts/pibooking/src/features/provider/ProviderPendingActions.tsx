import React, { useEffect, useState } from 'react';
import { Booking } from '../../types';
import { isPendingAcceptance, getRemainingMs, formatCountdown, isAcceptanceExpired } from '../../lib/acceptanceCountdown';

interface Props {
  booking: Booking;
  acceptingBookingId: string | null;
  onAccept: (id: string) => Promise<void> | void;
  onRejectOpen: (booking: Booking) => void;
  setActionMessage: (msg: string) => void;
  setAcceptingBookingId: (id: string | null) => void;
}

export function ProviderPendingActions({ booking, acceptingBookingId, onAccept, onRejectOpen, setActionMessage, setAcceptingBookingId }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;
  if (!isPendingAcceptance(booking)) return null;
  const expired = isAcceptanceExpired(booking.acceptance_deadline);
  const remain = formatCountdown(getRemainingMs(booking.acceptance_deadline));
  return (
    <div className="w-full flex flex-col items-center gap-2 pt-1">
      <span className={`inline-flex items-center justify-center text-[10px] font-bold tabular-nums ${expired ? 'text-rose-600' : 'text-zinc-600'}`}>
        {expired ? 'Acceptance window expired' : `Accept within ${remain}`}
      </span>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={expired || acceptingBookingId === booking.id}
          onClick={async () => {
            if (expired) {
              setActionMessage('This booking acceptance window has expired.');
              return;
            }
            setAcceptingBookingId(booking.id);
            try {
              await onAccept(booking.id);
              setActionMessage('Booking accepted.');
            } catch (error: any) {
              setActionMessage(error?.message || 'Could not accept booking.');
            } finally {
              setAcceptingBookingId(null);
            }
          }}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
        >
          {acceptingBookingId === booking.id ? 'Accepting...' : 'Accept'}
        </button>
        <button
          type="button"
          disabled={expired}
          onClick={() => onRejectOpen(booking)}
          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
