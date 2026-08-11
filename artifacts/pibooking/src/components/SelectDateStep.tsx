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
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* 5-Step Visual Progress Bar Header */}
      <BookingProgressBar currentStep={2} />

      {/* Step Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-to-service-detail"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Step 1 of 5
        </span>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-400" />
          <span>Select Booking Date</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Choose a date for your <strong className="text-zinc-200">{service.name}</strong> session ({service.durationMinutes} mins)
        </p>
      </div>

      {/* Day Selector Grid */}
      <div className="p-4 rounded-2xl bg-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>AVAILABLE DATES</span>
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Next 10 Days Open
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
                className={`p-3 rounded-xl transition text-left relative flex flex-col justify-between min-h-[82px] ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10 font-bold'
                    : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-700/60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`uppercase font-extrabold ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`}>
                    {d.dayName}
                  </span>
                  {d.isWeekend && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                      Weekend
                    </span>
                  )}
                </div>

                <div className="my-1">
                  <span className="text-2xl font-black leading-none block">{d.dayNum}</span>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {d.monthName}, 2026
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Summary Banner */}
      <div className="p-4 rounded-xl bg-zinc-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-zinc-400 block text-[10px] uppercase font-bold">Selected Date</span>
          <span className="text-sm font-bold text-white">
            {selectedDayObj?.fullDayName}, {selectedDayObj?.monthName} {selectedDayObj?.dayNum}, 2026
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">
          Available
        </span>
      </div>

      {/* Fixed Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="block text-zinc-400">Step 1 of 5</span>
            <span className="font-bold text-white truncate block">
              {selectedDayObj?.dayName}, {selectedDayObj?.monthName} {selectedDayObj?.dayNum}
            </span>
          </div>

          <button
            onClick={() => onSelectDate(selectedDate)}
            id="btn-confirm-date-step"
            className="flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>Next: Select Time</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
