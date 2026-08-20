import React, { useState } from 'react';
import { Booking } from '../types';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Copy,
  MessageSquare,
  ShieldCheck,
  Star,
  Send,
  Check,
  FileText,
  Paperclip,
  ArrowLeft,
  ChevronRight,
  User,
  ExternalLink,
  Filter,
  ArrowUpDown,
  AlertCircle,
  Search
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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'price_high'>('newest');
  
  const [copiedTxHash, setCopiedTxHash] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  // Filtering Logic
  const filteredBookings = bookings.filter((b) => {
    if (filter === 'active' && !(b.status === 'Confirmed' || b.status === 'In Progress' || b.status === 'Pending')) return false;
    if (filter === 'completed' && !(b.status === 'Completed' || b.status === 'Cancelled')) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      b.id,
      b.serviceName,
      b.date,
      b.timeSlot,
      b.status,
      b.providerName,
      b.businessName,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });

  // Sorting Logic
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortOrder === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortOrder === 'price_high') {
      return b.pricePi - a.pricePi;
    }
    // Default newest
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const activeBooking = bookings.find((b) => b.id === selectedBookingId) || null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxHash(true);
    setTimeout(() => setCopiedTxHash(false), 2000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeBooking && onAddReview) {
      onAddReview(activeBooking.id, reviewRating, reviewComment);
    }
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  // Helper for Status Badge Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return {
          label: 'In Progress',
          classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-500 animate-pulse'
        };
      case 'Confirmed':
        return {
          label: 'Confirmed',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500'
        };
      case 'Completed':
        return {
          label: 'Completed',
          classes: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          dot: 'bg-zinc-500'
        };
      case 'Cancelled':
        return {
          label: 'Cancelled',
          classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500'
        };
      default:
        return {
          label: status || 'Pending',
          classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
    }
  };

  // 1. EMPTY STATE IF NO BOOKINGS
  if (bookings.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
          <CalendarCheck className="w-8 h-8 stroke-[2]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-zinc-900">No Bookings Yet</h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto font-medium">
            You haven't booked any Web3 services yet. Connect with verified service providers and book securely using Pi Escrow.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowseServices}
          id="btn-empty-browse-services"
          className="py-3 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition shadow-md shadow-amber-600/20 active:scale-[0.98] cursor-pointer"
        >
          Browse Marketplace
        </button>
      </div>
    );
  }

  // 2. DEDICATED BOOKING DETAILS PAGE VIEW (LEVEL 2)
  if (selectedBookingId && activeBooking) {
    const providerDisplayName = activeBooking.providerName || activeBooking.businessName || 'W3C Verified Merchant';
    const providerInitials = providerDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'W3C';
    const badge = getStatusBadge(activeBooking.status);

    return (
      <div className="max-w-md mx-auto space-y-5 pb-28 animate-in fade-in duration-200">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 pb-1">
          <button
            type="button"
            onClick={() => setSelectedBookingId(null)}
            id="btn-back-to-bookings-list"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Bookings</span>
          </button>

          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Status Lifecycle & Escrow Banner */}
        {activeBooking.status === 'In Progress' && activeBooking.escrow_status === 'paid_escrowed' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 relative overflow-hidden shadow-2xs">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Payment Held in Escrow</span>
            </div>

            <p className="text-xs text-amber-950 font-medium leading-relaxed">
              Your payment of <strong className="font-bold text-amber-900">{activeBooking.pricePi.toFixed(2)} π</strong> is securely held in W3C Escrow. Once the provider completes your service to your satisfaction, release the payment to finish the booking.
            </p>

            <button
              type="button"
              onClick={() => onConfirmCompletion?.(activeBooking.id)}
              id={`btn-confirm-completion-${activeBooking.id}`}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm Completion & Release Payment</span>
            </button>
          </div>
        )}

        {/* Compact Provider / Telegram Card */}
        {activeBooking.status !== 'Cancelled' && (
          <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 overflow-hidden">
              <span className="text-xs font-black">{providerInitials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black text-zinc-900 truncate block">{providerDisplayName}</span>
            </div>

            <a
              href={`https://t.me/Web3CurrencyNG?text=Hi!%20I%20am%20following%20up%20on%20Booking%20%23${activeBooking.id}%20(${encodeURIComponent(activeBooking.serviceName)})`}
              target="_blank"
              rel="noopener noreferrer"
              id={`btn-telegram-my-bookings-${activeBooking.id}`}
              className="shrink-0 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-[11px] flex items-center gap-1.5 transition active:scale-[0.98] shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
              <span>Telegram Chat</span>
            </a>
          </div>
        )}

        {/* Booking Details */}
        <div className="space-y-5 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 leading-snug tracking-tight">
              {activeBooking.serviceName}
            </h2>
          </div>

          <div className="divide-y divide-zinc-100">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 py-3 first:pt-0 items-start">
              <span className="text-xs font-medium text-zinc-500">Appointment Date</span>
              <span className="text-xs font-black text-zinc-900 text-right break-words">{activeBooking.date}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 py-3 items-start">
              <span className="text-xs font-medium text-zinc-500">Time Slot</span>
              <span className="text-xs font-black text-zinc-900 text-right break-words">{activeBooking.timeSlot}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 py-3 items-start">
              <span className="text-xs font-medium text-zinc-500">Escrow Amount</span>
              <span className="text-sm font-black text-amber-600 text-right break-words">{activeBooking.pricePi.toFixed(2)} π</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 py-3 items-start">
              <span className="text-xs font-medium text-zinc-500">Requirement Notes</span>
              <span className="text-xs font-medium text-zinc-800 text-right whitespace-pre-wrap break-words">
                {activeBooking.notes || '—'}
              </span>
            </div>
          </div>

          {/* Pi Blockchain Tx Hash */}
          {activeBooking.piTxHash && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">PI BLOCKCHAIN TX</span>
                <span className="font-mono text-[11px] text-zinc-800 truncate block">{activeBooking.piTxHash}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeBooking.piTxHash!)}
                id="btn-copy-tx-hash-my-bookings"
                className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:text-amber-600 transition shrink-0 cursor-pointer"
                title="Copy Transaction Hash"
              >
                {copiedTxHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Attached Files */}
          {activeBooking.attachments && activeBooking.attachments.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-zinc-500 block text-[10px] font-bold uppercase">
                Attached Files ({activeBooking.attachments.length})
              </span>
              <div className="space-y-1">
                {activeBooking.attachments.map((att, idx) => (
                  <div key={att.id || idx} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium text-zinc-800 truncate">{att.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{att.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation Option */}
          {activeBooking.status === 'Confirmed' && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onCancelBooking(activeBooking.id)}
                id={`btn-cancel-booking-${activeBooking.id}`}
                className="text-xs text-rose-600 hover:text-rose-700 underline font-semibold transition cursor-pointer"
              >
                Request Appointment Cancellation & Refund
              </button>
            </div>
          )}
        </div>

        {/* Rating & Star Review Form (For Completed Bookings Only) */}
        {activeBooking.status === 'Completed' && (
          <div className="p-4 rounded-3xl bg-white border border-zinc-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Service Review</span>
              </h3>
              <span className="text-[10px] text-zinc-400 font-medium">Verified Client Review</span>
            </div>

            {activeBooking.rating || reviewSubmitted ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center space-y-1">
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
                <p className="text-xs font-black text-emerald-900">
                  Thank you! Your review has been recorded.
                </p>
                {(activeBooking.reviewComment || reviewComment) && (
                  <p className="text-xs text-zinc-700 italic">"{activeBooking.reviewComment || reviewComment}"</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <p className="text-xs text-zinc-600 font-medium">
                  Rate your experience with <strong className="text-zinc-900">{activeBooking.serviceName}</strong>:
                </p>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-1.5 rounded-xl transition cursor-pointer ${
                        star <= reviewRating ? 'text-amber-500 bg-amber-50' : 'text-zinc-300 hover:text-zinc-400'
                      }`}
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-500' : ''}`} />
                    </button>
                  ))}
                  <span className="text-xs font-black text-amber-600 ml-2">{reviewRating} / 5</span>
                </div>

                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share feedback regarding service quality and deliverability..."
                  className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
                />

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Star Review</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. COMPACT BOOKINGS OVERVIEW LIST VIEW (LEVEL 1 DEFAULT)
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Overview Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">My Bookings</h1>
          <button
            type="button"
            onClick={onBrowseServices}
            id="btn-list-browse-more"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer"
          >
            + Book New Service
          </button>
        </div>
        <p className="text-xs text-zinc-500 font-medium">
          {bookings.length} appointment record{bookings.length > 1 ? 's' : ''} stored on Pi Network
        </p>
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
          {(
            [
              { id: 'all', label: 'All', count: bookings.length },
              {
                id: 'active',
                label: 'Active',
                count: bookings.filter((b) => b.status === 'Confirmed' || b.status === 'In Progress' || b.status === 'Pending').length
              },
              { id: 'completed', label: 'Completed', count: bookings.filter((b) => b.status === 'Completed' || b.status === 'Cancelled').length }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filter === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  filter === tab.id ? 'bg-amber-700 text-amber-10' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 self-end sm:self-auto">
          <div className="relative flex-1 sm:flex-none sm:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings"
              aria-label="Search bookings"
              className="w-full bg-zinc-100 border border-zinc-200/80 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-xs text-zinc-500 font-medium">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-zinc-100 border border-zinc-200/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_high">Highest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* COMPACT BOOKING LIST */}
      {sortedBookings.length === 0 ? (
        <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800">No Bookings Found</h3>
            <p className="text-xs text-zinc-500">There are no booking records matching the current filters.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          {sortedBookings.map((b) => {
            const badge = getStatusBadge(b.status);

            return (
              <div
                key={b.id}
                onClick={() => setSelectedBookingId(b.id)}
                id={`card-booking-item-${b.id}`}
                className="group py-4 first:pt-3 last:pb-3 cursor-pointer transition hover:bg-zinc-50/70"
              >
                {/* Status & Price */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.classes}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>

                    {b.status === 'In Progress' && b.escrow_status === 'paid_escrowed' && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60">
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        <span>Escrow Protected</span>
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-amber-600 block">{b.pricePi.toFixed(2)} π</span>
                    <span className="text-[10px] text-zinc-400 block font-medium">Pi Escrow</span>
                  </div>
                </div>

                {/* Main Information */}
                <div className="flex items-center justify-between gap-3 mt-2.5">
                  <h3 className="text-sm font-black text-zinc-900 group-hover:text-amber-700 transition leading-snug truncate min-w-0">
                    {b.serviceName}
                  </h3>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 group-hover:translate-x-0.5 transition shrink-0">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Appointment Schedule */}
                <div className="flex items-center gap-1.5 text-zinc-600 font-semibold text-xs mt-2 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{b.date}</span>
                  <span className="text-zinc-300">•</span>
                  <span className="truncate">{b.timeSlot}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
