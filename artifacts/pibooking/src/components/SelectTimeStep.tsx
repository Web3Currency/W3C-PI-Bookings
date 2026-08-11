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
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* 5-Step Visual Progress Bar Header */}
      <BookingProgressBar currentStep={3} />

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-to-date-step"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Step 2 of 5
        </span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span>Select Time Slot</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Date: <strong className="text-amber-300">{dateObj.fullDayName}, {dateObj.monthName} {dateObj.dayNum}</strong> ({service.durationMinutes} mins)
        </p>
      </div>

      {/* Time Slot Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>REAL-TIME AVAILABILITY</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Instant Confirmation
          </span>
        </div>

        {TIME_SLOTS_GROUPS.map((group) => (
          <div key={group.category} className="p-4 rounded-2xl bg-zinc-800 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
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
                    className={`min-h-[50px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      isDisabled
                        ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                        : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-700/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`} />
                      <span>{slot.time}</span>
                    </span>

                    {isDisabled ? (
                      <span className="text-[10px] text-red-400 font-semibold">{slot.reason || 'Booked'}</span>
                    ) : isSelected ? (
                      <span className="p-1 rounded-full bg-zinc-950 text-amber-300">
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="block text-zinc-400">Step 2 of 5</span>
            <span className="font-bold text-white truncate block">
              {dateObj.dayName}, {dateObj.monthName} {dateObj.dayNum} @ {selectedSlot}
            </span>
          </div>

          <button
            onClick={() => onSelectTimeSlot(selectedSlot)}
            id="btn-confirm-time-step"
            className="flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>Next: Review Summary</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
