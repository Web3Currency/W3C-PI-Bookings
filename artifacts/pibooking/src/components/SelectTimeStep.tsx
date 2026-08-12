import React, { useState } from 'react';
import { Service, TimeSlotOption } from '../types';
import { ArrowLeft, Clock, ArrowRight, Sparkles, Check } from 'lucide-react';
import { getUpcomingDays } from './SelectDateStep';
import { BookingProgressBar } from './BookingProgressBar';

interface SelectTimeStepProps {
  service: Service;
  selectedDate: string;
  initialTimeSlot?: string;
  onBack: () => void;
  onSelectTimeSlot: (timeSlot: string) => void;
}

const TIME_SLOTS_GROUPS: { category: string; slots: TimeSlotOption[] }[] = [
  {
    category: 'Morning Sessions',
    slots: [
      { time: '09:00 AM', available: true },
      { time: '10:00 AM', available: true },
      { time: '10:30 AM', available: false, reason: 'Booked' },
      { time: '11:30 AM', available: true },
    ],
  },
  {
    category: 'Afternoon Sessions',
    slots: [
      { time: '01:00 PM', available: true },
      { time: '02:30 PM', available: true },
      { time: '03:45 PM', available: true },
      { time: '04:30 PM', available: false, reason: 'Reserved' },
    ],
  },
  {
    category: 'Evening Sessions',
    slots: [
      { time: '05:30 PM', available: true },
      { time: '06:15 PM', available: true },
      { time: '07:00 PM', available: true },
    ],
  },
];

export const SelectTimeStep: React.FC<SelectTimeStepProps> = ({
  service,
  selectedDate,
  initialTimeSlot,
  onBack,
  onSelectTimeSlot,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<string>(
    initialTimeSlot || '10:00 AM'
  );

  const availableDays = getUpcomingDays();
  const dateObj = availableDays.find((d) => d.dateStr === selectedDate) || availableDays[0];

  return (
    <div className="max-w-md mx-auto space-y-4 pb-28 animate-in fade-in duration-200">
      {/* 4-Step Visual Progress Bar Header */}
      <BookingProgressBar currentStep={2} />

      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-to-date-step"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
          Step 2: Time Slot
        </span>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-zinc-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Select Time Slot</span>
        </h1>
        <p className="text-xs text-zinc-500 font-medium">
          Date: <strong className="text-amber-900">{dateObj.fullDayName}, {dateObj.monthName} {dateObj.dayNum}</strong> ({service.durationMinutes} mins)
        </p>
      </div>

      {/* Time Slot Groups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
          <span>REAL-TIME AVAILABILITY</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Instant Confirmation
          </span>
        </div>

        {TIME_SLOTS_GROUPS.map((group) => (
          <div key={group.category} className="p-4 sm:p-5 rounded-3xl bg-white shadow-md space-y-3">
            <h3 className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider">
              {group.category}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {group.slots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                const isDisabled = !slot.available;

                return (
                  <button
                    key={slot.time}
                    disabled={isDisabled}
                    onClick={() => setSelectedSlot(slot.time)}
                    id={`time-slot-${slot.time.replace(/[: ]/g, '-')}`}
                    className={`min-h-[50px] px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      isDisabled
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                        : 'bg-zinc-50 text-zinc-800 hover:bg-amber-50/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />
                      <span>{slot.time}</span>
                    </span>

                    {isDisabled ? (
                      <span className="text-[10px] text-rose-500 font-semibold">{slot.reason || 'Booked'}</span>
                    ) : isSelected ? (
                      <span className="p-1 rounded-full bg-amber-700 text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="block text-zinc-400 font-bold text-[10px]">STEP 2 OF 4</span>
            <span className="font-bold text-zinc-900 truncate block">
              {dateObj.dayName}, {dateObj.monthName} {dateObj.dayNum} @ {selectedSlot}
            </span>
          </div>

          <button
            onClick={() => onSelectTimeSlot(selectedSlot)}
            id="btn-confirm-time-step"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <span>Next: Review Summary</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
