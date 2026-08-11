import React, { useState } from 'react';
import { Service, TimeSlotOption } from '../types';
import { ArrowLeft, Clock, Sparkles, CreditCard } from 'lucide-react';

interface DateTimePickerProps {
  service: Service;
  onBack: () => void;
  onConfirmDateTime: (date: string, timeSlot: string) => void;
}

// Generate upcoming 7 days starting tomorrow
const getUpcomingDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    days.push({ dateStr, dayName, dayNum, monthName, isWeekend: d.getDay() === 0 || d.getDay() === 6 });
  }
  return days;
};

// Available Time Slots divided into Morning, Afternoon, Evening
const TIME_SLOTS: { category: string; slots: TimeSlotOption[] }[] = [
  {
    category: 'Morning Slots',
    slots: [
      { time: '09:00 AM', available: true },
      { time: '10:00 AM', available: true },
      { time: '10:30 AM', available: false, reason: 'Booked' },
      { time: '11:30 AM', available: true },
    ],
  },
  {
    category: 'Afternoon Slots',
    slots: [
      { time: '01:00 PM', available: true },
      { time: '02:30 PM', available: true },
      { time: '03:45 PM', available: true },
      { time: '04:30 PM', available: false, reason: 'Reserved' },
    ],
  },
  {
    category: 'Evening Slots',
    slots: [
      { time: '05:30 PM', available: true },
      { time: '06:15 PM', available: true },
      { time: '07:00 PM', available: true },
    ],
  },
];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  service,
  onBack,
  onConfirmDateTime,
}) => {
  const availableDays = getUpcomingDays();
  const [selectedDate, setSelectedDate] = useState<string>(availableDays[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');

  const selectedDayObj = availableDays.find((d) => d.dateStr === selectedDate);

  return (
    <div className="space-y-5 pb-24 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-to-detail"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">
          Step 2 of 3
        </span>
      </div>

      {/* Title & Service Summary Badge */}
      <div>
        <h1 className="text-xl font-extrabold text-white">
          Select Date & Time
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          {service.name} • <span className="text-amber-400 font-bold">{service.durationMinutes} mins</span>
        </p>
      </div>

      {/* Date Horizontal Picker (Calendly Style Minimal Step) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>SELECT DATE</span>
          <span className="text-zinc-200">
            {selectedDayObj?.monthName} {selectedDayObj?.dayNum}, 2026
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {availableDays.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                id={`date-btn-${d.dateStr}`}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl min-w-[62px] min-h-[68px] transition-all active:scale-95 shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`}>
                  {d.dayName}
                </span>
                <span className="text-lg font-black my-0.5">{d.dayNum}</span>
                <span className={`text-[9px] font-medium ${isSelected ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                  {d.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Visual Grid (Fresha Style Tappable Slots) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>AVAILABLE TIME SLOTS</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Real-time availability
          </span>
        </div>

        {TIME_SLOTS.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 pl-1">
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
                    id={`slot-btn-${slot.time.replace(/[: ]/g, '-')}`}
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between min-w-[120px] ${
                      isDisabled
                        ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-amber-500 text-zinc-950 shadow-xs'
                        : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`} />
                      {slot.time}
                    </span>

                    {isDisabled ? (
                      <span className="text-[10px] text-red-400 font-semibold">{slot.reason || 'Booked'}</span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300">
                        Selected
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Date & Time Bar + Proceed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs min-w-0">
            <span className="block text-zinc-400">Selected Appointment</span>
            <span className="font-bold text-white truncate block">
              {selectedDayObj?.dayName}, {selectedDayObj?.monthName} {selectedDayObj?.dayNum} @ {selectedSlot}
            </span>
          </div>

          <button
            onClick={() => onConfirmDateTime(selectedDate, selectedSlot)}
            id="btn-confirm-date-time"
            className="py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>Proceed to Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
