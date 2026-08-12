import React, { useState } from 'react';
import { Booking } from '../types';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Copy,
  QrCode,
  Download,
  ArrowRight,
  ShieldCheck,
  Check,
  MessageSquare,
  User,
  ExternalLink,
  ChevronRight,
  FileText
} from 'lucide-react';

interface BookingConfirmationStepProps {
  booking: Booking;
  onGoToBookings: () => void;
}

export const BookingConfirmationStep: React.FC<BookingConfirmationStepProps> = ({
  booking,
  onGoToBookings,
}) => {
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [copiedRefId, setCopiedRefId] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const telegramLink = `https://t.me/Web3CurrencyNG?text=Hi!%20I%20just%20booked%20${encodeURIComponent(booking.serviceName)}%20(Booking%20%23${booking.id})`;

  const copyToClipboard = (text: string, type: 'tx' | 'ref') => {
    navigator.clipboard.writeText(text);
    if (type === 'tx') {
      setCopiedTxHash(true);
      setTimeout(() => setCopiedTxHash(false), 2000);
    } else {
      setCopiedRefId(true);
      setTimeout(() => setCopiedRefId(false), 2000);
    }
  };

  const generateICSFile = () => {
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//W3C Digital Network Appointment Pass//EN
BEGIN:VEVENT
SUMMARY:${booking.serviceName} - ${booking.businessName || booking.providerName || 'W3C Merchant'}
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

  const providerDisplayName = booking.providerName || booking.businessName || 'W3C Verified Merchant';

  return (
    <div className="max-w-md mx-auto space-y-4 pb-28 animate-in fade-in duration-200">
      {/* 1. TRANSACTION CONFIRMED HERO STAT */}
      <div className="text-center pt-1 space-y-2">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-500/5">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black uppercase tracking-wider border border-emerald-200/80 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Escrow Payment Confirmed</span>
          </div>

          <div className="pt-1 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {booking.pricePi.toFixed(2)}
            </span>
            <span className="text-lg font-black text-amber-600">π</span>
          </div>

          <p className="text-[11px] text-zinc-500 font-medium">
            Booking Pass issued for <strong className="text-zinc-800 font-bold">{providerDisplayName}</strong>
          </p>
        </div>
      </div>

      {/* 2. PRIMARY DIGITAL APPOINTMENT PASS CARD (WITH INTEGRATED TELEGRAM ACTION) */}
      <div className="rounded-3xl bg-white border border-zinc-200 shadow-md overflow-hidden">
        {/* Pass Top Ticket Header */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-4 sm:p-5 relative overflow-hidden">
          {/* Subtle background glow accent */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest border border-amber-500/30 shrink-0">
                APPOINTMENT PASS
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(booking.id, 'ref')}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white transition shrink-0 bg-zinc-800/80 px-2 py-0.5 rounded-md"
              title="Click to copy Reference ID"
            >
              <span>#{booking.id}</span>
              {copiedRefId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="mt-3 space-y-1">
            <h2 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight">
              {booking.serviceName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{providerDisplayName}</span>
            </div>
          </div>
        </div>

        {/* Perforated Ticket Divider Notch Styling */}
        <div className="relative bg-white h-4 border-b border-dashed border-zinc-200/90 flex items-center justify-between px-3">
          <div className="w-4 h-4 rounded-full bg-zinc-100 -ml-5 border-r border-zinc-200" />
          <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            W3C VERIFIED RECEIPT
          </div>
          <div className="w-4 h-4 rounded-full bg-zinc-100 -mr-5 border-l border-zinc-200" />
        </div>

        {/* Schedule & Detail Compact Grid */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Schedule Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase">
                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Date</span>
              </div>
              <span className="text-xs font-black text-zinc-900 block truncate">{booking.date}</span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Time Slot</span>
              </div>
              <span className="text-xs font-black text-zinc-900 block truncate">{booking.timeSlot}</span>
            </div>
          </div>

          {/* Crypto Transaction Specification Rows */}
          <div className="space-y-2 pt-1 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs py-0.5">
              <span className="text-zinc-500 font-medium">Pioneer Client</span>
              <span className="font-bold text-zinc-900 truncate max-w-[200px]">
                {booking.clientName} <span className="text-zinc-400 font-normal">(@{booking.clientPiUsername})</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-0.5">
              <span className="text-zinc-500 font-medium">Payment Protocol</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Pi Escrow</span>
              </span>
            </div>

            {/* Pi Blockchain Tx Hash */}
            {booking.piTxHash && (
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">PI BLOCKCHAIN TX</span>
                  <span className="font-mono text-[11px] text-zinc-800 truncate block">
                    {booking.piTxHash}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(booking.piTxHash!, 'tx')}
                  id="btn-copy-confirmation-hash"
                  className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:text-amber-600 transition shrink-0 shadow-2xs"
                  title="Copy Transaction Hash"
                >
                  {copiedTxHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Optional Notes */}
            {booking.notes && (
              <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/50 text-[11px] text-zinc-700 space-y-0.5">
                <span className="font-bold text-amber-800 flex items-center gap-1 text-[10px] uppercase">
                  <FileText className="w-3 h-3 text-amber-600" />
                  <span>Requirement Notes</span>
                </span>
                <p className="italic line-clamp-2 text-zinc-600">"{booking.notes}"</p>
              </div>
            )}
          </div>

          {/* INTEGRATED TELEGRAM WORKSPACE & PASS ACTION AREA */}
          <div className="pt-3 border-t border-zinc-100 space-y-2.5">
            {/* Telegram Workspace Primary Action Card */}
            <div className="p-3.5 rounded-2xl bg-sky-50/90 border border-sky-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <MessageSquare className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-sky-950">Project Telegram Workspace</h3>
                    <p className="text-[10px] text-sky-800 font-medium">Submit requirements & chat with provider</p>
                  </div>
                </div>
              </div>

              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-telegram-handoff"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Continue Chat on Telegram</span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-80" />
              </a>
            </div>

            {/* Quick Secondary Pass Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                id="btn-show-qr-pass"
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200/60 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-zinc-700" />
                <span>Show QR Pass</span>
              </button>

              <button
                type="button"
                onClick={generateICSFile}
                id="btn-download-ics-calendar"
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200/60 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-700" />
                <span>Add Calendar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. QR TICKET MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 space-y-4 text-center shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Check-In Pass</span>
              <h3 className="text-base font-black text-zinc-900 mt-0.5">
                {booking.serviceName}
              </h3>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl inline-block mx-auto border border-zinc-200 shadow-2xs">
              <img
                src={booking.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${booking.id}`}
                alt="Booking Check-In QR"
                className="w-40 h-40 object-contain"
              />
            </div>

            <div className="space-y-1 text-xs text-zinc-600 font-medium">
              <p>Reference ID: <strong className="font-mono text-zinc-900">#{booking.id}</strong></p>
              <p className="text-[11px] text-zinc-500">Present this QR pass to <strong className="text-zinc-800">{providerDisplayName}</strong> upon project check-in.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              id="btn-close-qr-modal"
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}

      {/* 4. FIXED BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 z-30 shadow-lg">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onGoToBookings}
            id="btn-view-my-bookings"
            className="w-full py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <span>View in My Bookings</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};

