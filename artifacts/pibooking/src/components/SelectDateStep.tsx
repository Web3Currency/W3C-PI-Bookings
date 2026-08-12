import React, { useState } from 'react';
import { Service } from '../types';
import { ArrowLeft, Calendar as CalendarIcon, ArrowRight, Sparkles } from 'lucide-react';
import { BookingProgressBar } from './BookingProgressBar';

interface SelectDateStepProps {
  service: Service;
  initialDate?: string;
  onBack: () => void;
  onSelectDate: (dateStr: string) => void;
}

// Generate upcoming 10 days starting tomorrow
export const getUpcomingDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    days.push({ dateStr, dayName, fullDayName, dayNum, monthName, isWeekend });
  }
  return days;
};

export const SelectDateStep: React.FC<SelectDateStepProps> = ({
  service,
  initialDate,
  onBack,
  onSelectDate,
}) => {
  const availableDays = getUpcomingDays();
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || availableDays[0].dateStr
  );

  const selectedDayObj = availableDays.find((d) => d.dateStr === selectedDate);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-28 animate-in fade-in duration-200">
      {/* 4-Step Visual Progress Bar Header */}
      <BookingProgressBar currentStep={2} />

      {/* Step Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-to-details-step"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
          Step 2: Choose Date
        </span>
      </div>

      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-zinc-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Select Booking Date</span>
        </h1>
        <p className="text-xs text-zinc-500 font-medium">
          Choose a date for your <strong className="text-zinc-800">{service.name}</strong> session ({service.durationMinutes} mins)
        </p>
      </div>

      {/* Day Selector Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
          <span>AVAILABLE DATES</span>
          <span className="text-amber-700 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Next 10 Days Open
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {availableDays.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                id={`date-card-${d.dateStr}`}
                className={`p-3 rounded-2xl transition text-left flex flex-col justify-between min-h-[82px] cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-bold'
                    : 'bg-zinc-50 text-zinc-800 hover:bg-amber-50/60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`uppercase font-extrabold ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                    {d.dayName}
                  </span>
                  {d.isWeekend && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${isSelected ? 'bg-amber-700 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                      Weekend
                    </span>
                  )}
                </div>

                <div className="my-1">
                  <span className="text-2xl font-black leading-none block">{d.dayNum}</span>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-amber-100' : 'text-zinc-500'}`}>
                    {d.monthName}, 2026
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Summary Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-between text-xs shadow-2xs">
        <div>
          <span className="text-zinc-500 block text-[10px] uppercase font-bold">Selected Schedule</span>
          <span className="text-sm font-black text-amber-950">
            {selectedDayObj?.fullDayName}, {selectedDayObj?.monthName} {selectedDayObj?.dayNum}, 2026
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
          Open
        </span>
      </div>

      {/* Fixed Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="block text-zinc-400 font-bold text-[10px]">STEP 2 OF 4</span>
            <span className="font-bold text-zinc-900 truncate block">
              {selectedDayObj?.dayName}, {selectedDayObj?.monthName} {selectedDayObj?.dayNum}
            </span>
          </div>

          <button
            onClick={() => onSelectDate(selectedDate)}
            id="btn-confirm-date-step"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <span>Next: Select Time</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
