import React from 'react';
import { Service, BusinessProfile, PiUser } from '../types';
import { ArrowLeft, Calendar, Clock, User, Phone, FileText, Lock, ArrowRight, ShieldCheck, Paperclip } from 'lucide-react';
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
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Consolidated 4-Step Progress Bar Header */}
      <BookingProgressBar currentStep={3} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          id="btn-back-to-schedule-step"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-black text-zinc-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          <span>Review Booking Summary</span>
        </h1>
        <p className="text-xs text-zinc-600 mt-1 font-medium">
          Verify your appointment schedule & pioneer contact information before Pi payment.
        </p>
      </div>

      {/* Selected Service Card - No border/outline */}
      <div className="p-4 rounded-2xl bg-white shadow-md space-y-3">
        <div className="flex items-center gap-3">
          {service.coverImageUrl && (
            <img
              src={service.coverImageUrl}
              alt={service.name}
              className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-xs"
            />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
              {business.name}
            </span>
            <h2 className="text-base font-extrabold text-zinc-900 truncate">
              {service.name}
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Duration: {service.durationMinutes} mins • {service.locationType}
            </p>
          </div>
        </div>

        {/* Schedule Highlights */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 flex items-center text-xs">
          <div className="p-3 rounded-xl bg-zinc-50 flex items-center gap-2 shadow-2xs">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-zinc-500 font-bold block">DATE</span>
              <span className="font-bold text-zinc-900 truncate block">
                {dateObj.dayName}, {dateObj.monthName} {dateObj.dayNum}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 flex items-center gap-2 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-zinc-500 font-bold block">TIME SLOT</span>
              <span className="font-bold text-zinc-900 truncate block">{selectedTimeSlot}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Details Summary Card - No border/outline */}
      <div className="p-4 rounded-2xl bg-white shadow-md space-y-3">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-amber-600" />
          <span>Pioneer Client Details</span>
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-zinc-100">
            <span className="text-zinc-600 font-medium">Name:</span>
            <span className="font-bold text-zinc-900">{clientDetails.clientName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-zinc-100">
            <span className="text-zinc-600 font-medium">Pi Username:</span>
            <span className="font-bold text-amber-700 font-mono">{clientDetails.clientPiUsername}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-zinc-100">
            <span className="text-zinc-600 font-medium">Phone Number:</span>
            <span className="font-bold text-zinc-900">{clientDetails.clientPhone}</span>
          </div>

          {clientDetails.notes && (
            <div className="py-1">
              <span className="text-zinc-600 font-medium block mb-0.5">Appointment Notes:</span>
              <p className="p-3 rounded-xl bg-zinc-50 text-zinc-800 text-xs italic shadow-2xs">
                "{clientDetails.notes}"
              </p>
            </div>
          )}

          {clientDetails.attachments && clientDetails.attachments.length > 0 && (
            <div className="py-1">
              <span className="text-zinc-600 font-medium block mb-1">Attached Wireframes / Specs ({clientDetails.attachments.length}):</span>
              <div className="space-y-1.5">
                {clientDetails.attachments.map((att) => (
                  <div key={att.id} className="p-2.5 rounded-xl bg-zinc-50 flex items-center gap-2 text-xs shadow-2xs">
                    <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium text-zinc-900 truncate">{att.name}</span>
                    <span className="text-[10px] text-zinc-500 ml-auto">{att.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown Card - No border/outline */}
      <div className="p-4 rounded-2xl bg-white shadow-md space-y-2 text-xs">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1">
          Payment Breakdown (Pi Network)
        </h3>

        <div className="flex justify-between text-zinc-700 font-medium">
          <span>Service Rate</span>
          <span className="font-bold text-zinc-900">{service.pricePi.toFixed(2)} π</span>
        </div>

        <div className="flex justify-between text-zinc-700 font-medium">
          <span>Pi Network Escrow Fee</span>
          <span className="font-bold text-emerald-600">0.00 π (Waived)</span>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-sm font-black text-zinc-900">
          <span>Total Payment Amount</span>
          <span className="text-amber-600 text-base">{service.pricePi.toFixed(2)} π</span>
        </div>
      </div>

      {/* Security Banner Card - No border/outline */}
      <div className="p-4 rounded-xl bg-amber-500/10 shadow-sm flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="text-[11px] text-amber-950">
          <p className="font-bold">Secured by Pi Network Bridge</p>
          <p className="text-amber-800">
            Funds will be held securely in Pi escrow until deliverable review.
          </p>
        </div>
      </div>

      {/* Fixed Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="block text-zinc-500 font-medium text-[10px]">Step 3 of 4</span>
            <span className="text-lg font-black text-amber-600">
              {service.pricePi.toFixed(2)} π
            </span>
          </div>

          <button
            type="button"
            onClick={onProceedToPayment}
            id="btn-proceed-to-pi-payment"
            className="flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-500/20"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" />
            <span>Proceed to Pi Pay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
