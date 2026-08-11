import React, { useState } from 'react';
import { Booking } from '../types';
import {
  CalendarCheck,
  CheckCircle2,
  CheckCheck,
  Clock,
  QrCode,
  Copy,
  Download,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Star,
  Send,
  Check,
  FileText,
  Paperclip
} from 'lucide-react';

interface BookingStatusViewProps {
  bookings: Booking[];
  onBrowseServices: () => void;
  onCancelBooking: (bookingId: string) => void;
  onRescheduleBooking: (booking: Booking) => void;
  onAddReview?: (bookingId: string, rating: number, comment: string) => void;
  onConfirmCompletion?: (bookingId: string) => void;
}

export const BookingStatusView: React.FC<BookingStatusViewProps> = ({
  bookings,
  onBrowseServices,
  onCancelBooking,
  onRescheduleBooking,
  onAddReview,
  onConfirmCompletion,
}) => {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedBookingId, setSelectedBookingId] = useState<string>(bookings[0]?.id || '');
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const activeBooking = bookings.find((b) => b.id === selectedBookingId) || filteredBookings[0] || bookings[0];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxHash(true);
    setTimeout(() => setCopiedTxHash(false), 2000);
  };

  const generateICSFile = (b: Booking) => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//W3C Digital Network Appointment Pass//EN
BEGIN:VEVENT
SUMMARY:${b.serviceName} - ${b.businessName}
DESCRIPTION:Appointment for ${b.serviceName} paid with ${b.pricePi} Pi. Booking ID: ${b.id}
DTSTART:${b.date.replace(/-/g, '')}T100000Z
DTEND:${b.date.replace(/-/g, '')}T110000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `booking-${b.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeBooking && onAddReview) {
      onAddReview(activeBooking.id, reviewRating, reviewComment);
    }
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 px-4 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-900">No Bookings Yet</h2>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto">
            You have not booked any appointments with W3C Digital Network yet.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowseServices}
          id="btn-empty-browse-services"
          className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition shadow-xs"
        >
          Browse Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900">My Bookings</h1>
          <p className="text-xs text-zinc-500">
            {bookings.length} appointment record{bookings.length > 1 ? 's' : ''} on Pi Blockchain
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition shrink-0 ${
              filter === st
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {st === 'all' ? 'All Bookings' : st}
          </button>
        ))}
      </div>

      {/* Booking List Selector Cards */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {filteredBookings.map((b) => {
          const isSelected = activeBooking?.id === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBookingId(b.id)}
              className={`p-3 rounded-2xl text-xs font-semibold shrink-0 transition min-w-[160px] text-left border ${
                isSelected
                  ? 'bg-amber-500 text-white border-amber-600 font-black shadow-sm'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="font-extrabold truncate">{b.serviceName}</div>
              <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-100 font-bold' : 'text-zinc-500'}`}>
                {b.date} • {b.timeSlot}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className={`text-[10px] font-mono font-extrabold ${isSelected ? 'text-white' : 'text-amber-600'}`}>
                  #{b.id}
                </span>
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold ${
                  b.status === 'Confirmed' ? (isSelected ? 'bg-amber-600 text-white' : 'bg-emerald-100 text-emerald-800') : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {b.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeBooking && (
        <div className="space-y-4">
          {/* Main Selected Booking Ticket Pass Card */}
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200/80 overflow-hidden space-y-0 shadow-sm">
            {/* Top Header Ticket Band */}
            <div className="bg-zinc-100/80 p-4 border-b border-zinc-200">
              <div>
                <h2 className="text-lg font-black tracking-tight text-zinc-900">{activeBooking.serviceName}</h2>
                <p className="text-xs text-zinc-600 mt-0.5">{activeBooking.businessName}</p>
              </div>
            </div>

            {/* Escrow Status Banner: Payment Held in Escrow (Awaiting Completion Confirmation) */}
            {activeBooking.status === "In Progress" && activeBooking.escrow_status === "paid_escrowed" && (
              <div className="p-4 bg-amber-50/80 border-b border-amber-200 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-black uppercase tracking-wider">
                  <span>💰 Payment Held in Escrow</span>
                </div>

                <p className="text-xs text-amber-950 leading-relaxed font-medium">
                  Your payment ({activeBooking.pricePi} π) is securely held by W3C Digital Network. Once you confirm the service is complete, the payment will be released to the service provider.
                </p>

                <button
                  type="button"
                  onClick={() => onConfirmCompletion?.(activeBooking.id)}
                  id={`btn-confirm-completion-${activeBooking.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Completion & Release Payment</span>
                </button>
              </div>
            )}

            {/* Persistent Telegram Action Hero Banner (For Active Bookings) */}
            {activeBooking.status === "In Progress" && activeBooking.escrow_status === "paid_escrowed" && (
              <div className="p-4 bg-blue-50/80 border-b border-blue-200 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-blue-900 text-xs font-black uppercase tracking-wider">
                  <span>CONNECT ON TELEGRAM</span>
                </div>

                <p className="text-xs text-blue-950 leading-relaxed font-medium">
                  To start your project and share requirements, assets, and design feedback, jump into our Telegram!
                </p>

                <a
                  href={`https://t.me/Web3CurrencyNG?text=Hi!%20I%20am%20following%20up%20on%20Booking%20%23${activeBooking.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id={`btn-telegram-my-bookings-${activeBooking.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-blue-500/20"
                >
                  <span>Continue Chat on Telegram →</span>
                </a>
              </div>
            )}

            {/* Date & Time Grid */}
            <div className="p-4 bg-white border-b border-dashed border-zinc-200 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="text-[10px] text-zinc-500 block font-medium">DATE</span>
                  <span className="font-bold text-zinc-900">{activeBooking.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="text-[10px] text-zinc-500 block font-medium">TIME SLOT</span>
                  <span className="font-bold text-zinc-900">{activeBooking.timeSlot}</span>
                </div>
              </div>
            </div>

            {/* Pass Details */}
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Booking Reference</span>
                <span className="font-mono font-bold text-zinc-900">#{activeBooking.id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Pioneer Client</span>
                <span className="font-bold text-zinc-900">
                  {activeBooking.clientName} ({activeBooking.clientPiUsername})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Pi Payment Amount</span>
                <span className="font-black text-amber-600 text-sm">{activeBooking.pricePi} π</span>
              </div>

              {activeBooking.notes && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Appointment Notes</span>
                  <p className="text-xs text-zinc-700 mt-0.5 italic">"{activeBooking.notes}"</p>
                </div>
              )}

              {activeBooking.attachments && activeBooking.attachments.length > 0 && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase mb-1">
                    Attached Files ({activeBooking.attachments.length})
                  </span>
                  <div className="space-y-1">
                    {activeBooking.attachments.map((att) => (
                      <div key={att.id} className="p-2 rounded-lg bg-zinc-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-medium text-zinc-800 truncate">{att.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0">{att.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escrow & Guarantee Badging */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Protected by Pi Network Escrow & Refund Guarantee</span>
              </div>

              {/* Pi Transaction Hash */}
              {activeBooking.piTxHash && (
                <div className="p-2.5 rounded-xl bg-zinc-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase">PI BLOCKCHAIN TX HASH</span>
                    <span className="font-mono text-[11px] text-zinc-800 truncate block">
                      {activeBooking.piTxHash}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeBooking.piTxHash!)}
                    id="btn-copy-tx-hash-my-bookings"
                    className="p-1.5 rounded-lg bg-zinc-200 text-zinc-700 hover:text-amber-600 transition shrink-0"
                    title="Copy Transaction Hash"
                  >
                    {copiedTxHash ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Action Buttons: QR Ticket + Add to Calendar */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQRModal(true)}
                  id="btn-show-qr-my-bookings"
                  className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show QR Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateICSFile(activeBooking)}
                  id="btn-download-ics-my-bookings"
                  className="py-2.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Add Calendar</span>
                </button>
              </div>

              {/* Cancellation Option */}
              {activeBooking.status === 'Confirmed' && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => onCancelBooking(activeBooking.id)}
                    className="text-xs text-red-600 hover:text-red-700 underline font-semibold"
                  >
                    Request Appointment Cancellation / Refund
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Rating & Review Submission Module (For Completed or Past Bookings) */}
          {(activeBooking.status === 'Completed' || activeBooking.status === 'Confirmed') && (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Leave Service Star Review</span>
                </h3>
                <span className="text-[10px] text-zinc-500">Verified Pi Client Review</span>
              </div>

              {activeBooking.rating || reviewSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (activeBooking.rating || reviewRating)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-zinc-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-extrabold text-emerald-900">
                    Thank you! Review submitted successfully.
                  </p>
                  {activeBooking.reviewComment && (
                    <p className="text-xs text-zinc-700 italic">"{activeBooking.reviewComment}"</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <p className="text-xs text-zinc-600">
                    How was your experience with <strong className="text-zinc-900">{activeBooking.serviceName}</strong>?
                  </p>

                  {/* Star Rating Buttons */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`p-1.5 rounded-lg transition ${
                          star <= reviewRating ? 'text-amber-500 bg-amber-50' : 'text-zinc-300 hover:text-zinc-500'
                        }`}
                      >
                        <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-500' : ''}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-2">{reviewRating} / 5 Stars</span>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Write your feedback for W3C Digital Network..."
                      className="w-full p-2.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR Code Pass Modal */}
      {showQRModal && activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white border border-zinc-200 p-6 space-y-4 text-center shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900">
              Appointment QR Ticket
            </h3>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl inline-block mx-auto">
              <img
                src={activeBooking.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${activeBooking.id}`}
                alt="Booking Check-In QR"
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-xs text-zinc-600">
              Present this QR code to <strong className="text-zinc-900">{activeBooking.businessName}</strong> upon check-in.
            </p>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-xs"
            >
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
