import React, { useState } from 'react';
import { Booking } from '../types';
import { CheckCircle2, Calendar, Clock, Copy, QrCode, Download, ArrowRight, ShieldCheck, Check, MessageSquare } from 'lucide-react';

interface BookingConfirmationStepProps {
  booking: Booking;
  onGoToBookings: () => void;
}

export const BookingConfirmationStep: React.FC<BookingConfirmationStepProps> = ({
  booking,
  onGoToBookings,
}) => {
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const telegramLink = `https://t.me/Web3CurrencyNG?text=Hi!%20I%20just%20booked%20${encodeURIComponent(booking.serviceName)}%20(Booking%20%23${booking.id})`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxHash(true);
    setTimeout(() => setCopiedTxHash(false), 2000);
  };

  const generateICSFile = () => {
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//W3C Digital Network Appointment Pass//EN
BEGIN:VEVENT
SUMMARY:${booking.serviceName} - ${booking.businessName}
DESCRIPTION:Appointment booked on W3C Digital Network. Reference ID: ${booking.id}
DTSTART:${booking.date.replace(/-/g, '')}T100000Z
DTEND:${booking.date.replace(/-/g, '')}T110000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointment-${booking.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Celebration Banner */}
      <div className="text-center pt-2 space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-50 hover:ring-emerald-100 transition animate-bounce">
          <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider shadow-2xs">
          <span>✓ Payment Received ({booking.pricePi.toFixed(2)} π)</span>
        </div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="text-xs text-zinc-600 max-w-xs mx-auto font-mono">
          Ref ID: <span className="text-amber-700 font-bold">#{booking.id}</span>
        </p>
      </div>

      {/* Hero Telegram Handoff Card - No border/outline */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 shadow-md space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 text-blue-700 text-xs font-black uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>🚀 NEXT STEP: CONNECT ON TELEGRAM</span>
        </div>

        <p className="text-xs text-zinc-700 font-medium leading-relaxed">
          To start your project and share requirements, assets, and design feedback, jump straight into our project workspace on Telegram!
        </p>

        {/* Primary High-Visibility Telegram CTA Button */}
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          id="btn-telegram-handoff"
          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-blue-500/20"
        >
          <MessageSquare className="w-5 h-5 fill-current" />
          <span>Continue Chat on Telegram →</span>
        </a>

        {/* Clear Expectations Banner */}
        <div className="p-3 rounded-xl bg-white/90 shadow-2xs text-[11px] text-zinc-700 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Client Note:</strong> For real-time project updates, direct asset file sharing, and instant discussions, all communication is hosted on Telegram.
          </span>
        </div>
      </div>

      {/* Official Digital Pass Card - No border/outline */}
      <div className="rounded-2xl bg-white overflow-hidden shadow-md space-y-0">
        {/* Header Ticket Band */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 font-black">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full font-extrabold backdrop-blur-xs">
              OFFICIAL APPOINTMENT PASS
            </span>
            <span className="text-xs font-black uppercase tracking-wider bg-black/20 text-white px-2.5 py-0.5 rounded-full">
              CONFIRMED
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-lg font-black leading-snug">{booking.serviceName}</h2>
            <p className="text-xs text-amber-100 font-semibold mt-0.5">{booking.businessName}</p>
          </div>
        </div>

        {/* Date & Time Grid */}
        <div className="p-4 bg-white border-b border-dashed border-zinc-200 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold">DATE</span>
              <span className="font-bold text-zinc-900">{booking.date}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold">TIME SLOT</span>
              <span className="font-bold text-zinc-900">{booking.timeSlot}</span>
            </div>
          </div>
        </div>

        {/* Pass Details */}
        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 font-medium">Booking Reference</span>
            <span className="font-mono font-bold text-zinc-900">#{booking.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600 font-medium">Pioneer Client</span>
            <span className="font-bold text-zinc-900">
              {booking.clientName} ({booking.clientPiUsername})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600 font-medium">Pi Payment Amount</span>
            <span className="font-black text-amber-600 text-sm">{booking.pricePi.toFixed(2)} π</span>
          </div>

          {/* Blockchain Transaction Hash */}
          {booking.piTxHash && (
            <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 font-bold block uppercase">PI BLOCKCHAIN TX HASH</span>
                <span className="font-mono text-[11px] text-zinc-800 truncate block">
                  {booking.piTxHash}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(booking.piTxHash!)}
                id="btn-copy-confirmation-hash"
                className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:text-amber-600 transition shrink-0"
                title="Copy Transaction Hash"
              >
                {copiedTxHash ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Ticket Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              id="btn-show-qr-pass"
              className="py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4 text-amber-700" />
              <span>Show QR Ticket</span>
            </button>

            <button
              type="button"
              onClick={generateICSFile}
              id="btn-download-ics-calendar"
              className="py-2.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Add to Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 space-y-4 text-center shadow-2xl border border-zinc-200">
            <h3 className="text-base font-bold text-zinc-900">
              Appointment QR Ticket
            </h3>

            <div className="p-4 bg-zinc-50 rounded-xl inline-block mx-auto border border-zinc-200">
              <img
                src={booking.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${booking.id}`}
                alt="Booking Check-In QR"
                className="w-40 h-40"
              />
            </div>

            <p className="text-xs text-zinc-600 font-medium">
              Present this QR code to <strong className="text-zinc-900">{booking.businessName}</strong> upon session arrival or check-in.
            </p>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              id="btn-close-qr-modal"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-30">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onGoToBookings}
            id="btn-view-my-bookings"
            className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-500/20"
          >
            <span>View in My Bookings</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
