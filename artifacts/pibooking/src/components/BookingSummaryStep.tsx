import React from 'react';
import { Service, BusinessProfile, PiUser } from '../types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
  Paperclip,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { getUpcomingDays } from './SelectDateStep';
import { BookingProgressBar } from './BookingProgressBar';

interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
}

interface BookingSummaryStepProps {
  service: Service;
  business: BusinessProfile;
  selectedDate: string;
  selectedTimeSlot: string;
  clientDetails: {
    clientName: string;
    clientPiUsername: string;
    clientPhone: string;
    notes: string;
    attachments?: AttachedFile[];
  };
  piUser: PiUser | null;
  onBack: () => void;
  onProceedToPayment: () => void;
}

export const BookingSummaryStep: React.FC<BookingSummaryStepProps> = ({
  service,
  business,
  selectedDate,
  selectedTimeSlot,
  clientDetails,
  onBack,
  onProceedToPayment,
}) => {
  const availableDays = getUpcomingDays();
  const dateObj = availableDays.find((d) => d.dateStr === selectedDate) || availableDays[0];

  return (
    <div className="max-w-md mx-auto space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Step Progress Bar */}
      <BookingProgressBar currentStep={3} />

      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          id="btn-back-to-schedule-step"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
          Step 3: Final Review
        </span>
      </div>

      {/* Section Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Confirm Booking Details</span>
        </h1>
        <p className="text-xs text-zinc-500 font-medium">
          Preview your provisional appointment pass and verify information before authorizing Pi payment.
        </p>
      </div>

      {/* PROVISIONAL APPOINTMENT PASS (PRE-CREATION PREVIEW) */}
      <div className="rounded-3xl bg-white border border-zinc-200 shadow-md overflow-hidden">
        {/* Pass Top Ticket Header */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest border border-amber-500/30">
              PROVISIONAL PASS PREVIEW
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50">
              UNCONFIRMED
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
              {business.name}
            </span>
            <h2 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight">
              {service.name}
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              {service.durationMinutes} mins • {service.locationType}
            </p>
          </div>
        </div>

        {/* Perforated Edge Divider */}
        <div className="relative bg-white h-4 border-b border-dashed border-zinc-200/90 flex items-center justify-between px-3">
          <div className="w-4 h-4 rounded-full bg-zinc-100 -ml-5 border-r border-zinc-200" />
          <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            PRE-PAYMENT CHECKOUT
          </div>
          <div className="w-4 h-4 rounded-full bg-zinc-100 -mr-5 border-l border-zinc-200" />
        </div>

        {/* Pass Details Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Schedule Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase">
                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Selected Date</span>
              </div>
              <span className="text-xs font-black text-zinc-900 block truncate">
                {dateObj.dayName}, {dateObj.monthName} {dateObj.dayNum}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Time Slot</span>
              </div>
              <span className="text-xs font-black text-zinc-900 block truncate">{selectedTimeSlot}</span>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-2 pt-1 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs py-0.5">
              <span className="text-zinc-500 font-medium">Pioneer Client</span>
              <span className="font-bold text-zinc-900 truncate max-w-[200px]">
                {clientDetails.clientName} <span className="text-zinc-400 font-normal">(@{clientDetails.clientPiUsername})</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-0.5">
              <span className="text-zinc-500 font-medium">Contact Phone</span>
              <span className="font-mono font-bold text-zinc-800">{clientDetails.clientPhone}</span>
            </div>

            {/* Requirement Notes */}
            {clientDetails.notes && (
              <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/50 text-[11px] text-zinc-700 space-y-0.5">
                <span className="font-bold text-amber-800 flex items-center gap-1 text-[10px] uppercase">
                  <FileText className="w-3 h-3 text-amber-600" />
                  <span>Appointment Notes</span>
                </span>
                <p className="italic text-zinc-600">"{clientDetails.notes}"</p>
              </div>
            )}

            {/* Attached Files */}
            {clientDetails.attachments && clientDetails.attachments.length > 0 && (
              <div className="pt-2 border-t border-zinc-100">
                <span className="text-zinc-500 block text-[10px] font-bold uppercase mb-1">
                  Attached Specifications ({clientDetails.attachments.length})
                </span>
                <div className="space-y-1">
                  {clientDetails.attachments.map((att) => (
                    <div key={att.id} className="p-2 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between text-xs">
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
          </div>

          {/* Payment Breakdown */}
          <div className="pt-3 border-t border-zinc-100 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Payment Summary
            </span>

            <div className="flex justify-between text-xs text-zinc-600">
              <span>Service Rate</span>
              <span className="font-bold text-zinc-900">{service.pricePi.toFixed(2)} π</span>
            </div>

            <div className="flex justify-between text-xs text-zinc-600">
              <span>Pi Network Escrow Fee</span>
              <span className="font-bold text-emerald-600">0.00 π (Waived)</span>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-sm font-black text-zinc-900">
              <span>Total Payable</span>
              <span className="text-amber-600 text-base font-black">{service.pricePi.toFixed(2)} π</span>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow Guarantee Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="text-[11px] text-amber-950">
          <p className="font-bold">Secured by Pi Network Escrow</p>
          <p className="text-amber-800 font-medium">
            Payment will be held in smart escrow until service completion is confirmed.
          </p>
        </div>
      </div>

      {/* Fixed Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="block text-zinc-400 font-bold text-[10px]">TOTAL PRICE</span>
            <span className="text-lg font-black text-amber-600">
              {service.pricePi.toFixed(2)} π
            </span>
          </div>

          <button
            type="button"
            onClick={onProceedToPayment}
            id="btn-proceed-to-pi-payment"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" />
            <span>Proceed to Pi Pay</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
