import React, { useState, useEffect, useRef } from 'react';
import { Service } from '../types';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from 'lucide-react';
import { BookingProgressBar } from './BookingProgressBar';

interface SelectScheduleStepProps {
  service: Service;
  initialDate?: string;
  initialTimeSlot?: string;
  onBack: () => void;
  onConfirmSchedule: (dateStr: string, timeSlot: string) => void;
}

// Quick Time Slot Presets compatible with standard booking options
const QUICK_TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:30 AM',
  '01:00 PM',
  '02:30 PM',
  '03:45 PM',
  '05:30 PM',
  '07:00 PM',
];

const HOURS_LIST = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES_LIST = ['00', '15', '30', '45'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format Date -> YYYY-MM-DD
function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper to parse YYYY-MM-DD -> Date
function parseISOToDate(isoStr: string): Date {
  if (!isoStr) return new Date();
  const parts = isoStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

// Helper to parse time string "02:30 PM" -> { hour: "02", minute: "30", period: "PM" }
function parseTimeString(timeStr: string) {
  const match = timeStr?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    const period = match[3].toUpperCase();
    return {
      hour: String(h).padStart(2, '0'),
      minute: MINUTES_LIST.includes(m) ? m : '00',
      period: period === 'AM' || period === 'PM' ? period : 'PM',
    };
  }
  return { hour: '02', minute: '30', period: 'PM' };
}

export const SelectScheduleStep: React.FC<SelectScheduleStepProps> = ({
  service,
  initialDate,
  initialTimeSlot,
  onBack,
  onConfirmSchedule,
}) => {
  // Initialize Date & Time states
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const defaultDateStr = initialDate || formatDateToISO(tomorrow);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(defaultDateStr);

  const parsedInitialTime = parseTimeString(initialTimeSlot || '02:30 PM');
  const [selectedHour, setSelectedHour] = useState<string>(parsedInitialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState<string>(parsedInitialTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsedInitialTime.period as 'AM' | 'PM');

  // Calendar month navigation state
  const selectedDateObj = parseISOToDate(selectedDateStr);
  const [currentYear, setCurrentYear] = useState<number>(selectedDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(selectedDateObj.getMonth());

  // Active Android selector mode: 'date' | 'time' | 'both'
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');

  // Scroll Refs for Drum Wheels
  const hoursWheelRef = useRef<HTMLDivElement>(null);
  const minutesWheelRef = useRef<HTMLDivElement>(null);

  // Sync current month/year if selectedDateStr changes outside
  useEffect(() => {
    const d = parseISOToDate(selectedDateStr);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  }, [selectedDateStr]);

  // Derived time string
  const formattedTimeSlot = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;

  // Drum wheel scroll position auto-alignment
  const scrollToWheelValue = (container: HTMLDivElement | null, itemIndex: number) => {
    if (!container) return;
    const itemHeight = 44; // 44px item height
    container.scrollTo({
      top: itemIndex * itemHeight,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (activeTab === 'time') {
      const hIdx = HOURS_LIST.indexOf(selectedHour);
      if (hIdx !== -1) scrollToWheelValue(hoursWheelRef.current, hIdx);

      const mIdx = MINUTES_LIST.indexOf(selectedMinute);
      if (mIdx !== -1) scrollToWheelValue(minutesWheelRef.current, mIdx);
    }
  }, [activeTab, selectedHour, selectedMinute]);

  // Calendar Math
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Quick Date Presets
  const getQuickPresetDate = (type: 'today' | 'tomorrow' | 'saturday' | 'monday') => {
    const d = new Date(today);
    if (type === 'today') {
      return formatDateToISO(d);
    }
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      return formatDateToISO(d);
    }
    if (type === 'saturday') {
      const dayOfWeek = d.getDay();
      const distance = (6 - dayOfWeek + 7) % 7 || 7;
      d.setDate(d.getDate() + distance);
      return formatDateToISO(d);
    }
    if (type === 'monday') {
      const dayOfWeek = d.getDay();
      const distance = (1 - dayOfWeek + 7) % 7 || 7;
      d.setDate(d.getDate() + distance);
      return formatDateToISO(d);
    }
    return formatDateToISO(d);
  };

  // Select Quick Time Slot Preset
  const handleSelectQuickTimeSlot = (slot: string) => {
    const parsed = parseTimeString(slot);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period as 'AM' | 'PM');
  };

  // Full formatted string for header display
  const displayFormattedDate = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-32 box-border overflow-x-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Consolidated 4-Step Visual Progress Bar Header */}
      <BookingProgressBar currentStep={2} />

      {/* Top Header / Back Button */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBack}
          id="btn-back-to-details"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-xs font-semibold hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-700" />
          <span>Back</span>
        </button>

        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
          <span>Step 2 of 4</span>
        </span>
      </div>

      {/* Page Title & Context */}
      <div className="px-1">
        <h1 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
          <span>Select Date & Time</span>
        </h1>
        <p className="text-xs text-zinc-600 mt-0.5 font-medium">
          Service: <strong className="text-zinc-900">{service.name}</strong> ({service.durationMinutes} mins)
        </p>
      </div>

      {/* Clean Android-style Segmented Tab Controller */}
      <div className="p-1 rounded-2xl bg-zinc-100 border border-zinc-200/80 flex gap-1 box-border">
        <button
          type="button"
          onClick={() => setActiveTab('date')}
          id="tab-select-date"
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'date'
              ? 'bg-white text-amber-900 shadow-sm border border-zinc-200/60 font-black'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <CalendarIcon className={`w-4 h-4 ${activeTab === 'date' ? 'text-amber-600' : 'text-zinc-400'}`} />
          <span>Date ({displayFormattedDate})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('time')}
          id="tab-select-time"
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'time'
              ? 'bg-white text-amber-900 shadow-sm border border-zinc-200/60 font-black'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Clock className={`w-4 h-4 ${activeTab === 'time' ? 'text-amber-600' : 'text-zinc-400'}`} />
          <span>Time ({formattedTimeSlot})</span>
        </button>
      </div>

      {/* SECTION 1: NATIVE ANDROID DATE SELECTOR CARD */}
      {activeTab === 'date' && (
        <div className="p-4 rounded-2xl bg-white shadow-md border border-zinc-100 space-y-4 box-border animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
            <span className="flex items-center gap-1.5 font-extrabold uppercase text-amber-700 tracking-wider">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
              <span>Select Date</span>
            </span>
            <span className="text-[11px] font-semibold text-zinc-500">Tap to select date</span>
          </div>

          {/* Quick Date Presets Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
            {[
              { label: 'Today', key: 'today' },
              { label: 'Tomorrow', key: 'tomorrow' },
              { label: 'Sat', key: 'saturday' },
              { label: 'Mon', key: 'monday' },
            ].map((preset) => {
              const pDate = getQuickPresetDate(preset.key as any);
              const isSelected = selectedDateStr === pDate;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedDateStr(pDate)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Month Header Navigation */}
          <div className="flex items-center justify-between px-1 py-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-700 active:scale-95 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm font-extrabold text-zinc-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-700 active:scale-95 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Days of Week Header Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[11px] text-zinc-400 uppercase tracking-wider">
            {WEEKDAY_NAMES_SHORT.map((wd) => (
              <div key={wd} className="py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Calendar Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center box-border">
            {/* Empty padding days for month start */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-9 w-9 sm:h-10 sm:w-10 mx-auto" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const cellDate = new Date(currentYear, currentMonth, dayNum);
              cellDate.setHours(0, 0, 0, 0);

              const cellDateStr = formatDateToISO(cellDate);
              const isSelected = selectedDateStr === cellDateStr;
              const isPast = cellDate < today;
              const isToday = cellDate.getTime() === today.getTime();

              return (
                <button
                  key={cellDateStr}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDateStr(cellDateStr)}
                  className={`h-9 w-9 sm:h-10 sm:w-10 mx-auto rounded-full flex items-center justify-center text-xs sm:text-sm font-extrabold transition-all duration-150 cursor-pointer ${
                    isPast
                      ? 'text-zinc-300 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                      : isToday
                      ? 'bg-amber-50 text-amber-900 ring-2 ring-amber-500/60 font-black'
                      : 'text-zinc-800 hover:bg-amber-100/70 active:scale-95'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Action button to switch to time selection */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold">
              Selected: <strong className="text-amber-800 font-extrabold">{displayFormattedDate}</strong>
            </span>

            <button
              type="button"
              onClick={() => setActiveTab('time')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>Next: Set Time</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: TIME SELECTION CARD */}
      {activeTab === 'time' && (
        <div className="p-4 rounded-2xl bg-white shadow-md border border-zinc-100 space-y-4 box-border animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
            <span className="flex items-center gap-1.5 font-extrabold uppercase text-amber-700 tracking-wider">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Select Time Slot</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">Tap to pick a time</span>
          </div>

          {/* Quick Time Presets Grid */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Available Time Slots
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_TIME_SLOTS.map((slot) => {
                const isSelected = formattedTimeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSelectQuickTimeSlot(slot)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    <span>{slot}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Switch back to date picker if desired */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('date')}
              className="text-xs text-amber-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Change Date ({displayFormattedDate})</span>
            </button>
          </div>
        </div>
      )}

      {/* FIXED STICKY ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-50 p-3 sm:p-4 box-border shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs">
            <span className="block text-zinc-500 font-bold text-[10px] uppercase tracking-wider">
              Selected Schedule
            </span>
            <span className="font-extrabold text-zinc-900 truncate block text-xs">
              {displayFormattedDate} @ {formattedTimeSlot}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onConfirmSchedule(selectedDateStr, formattedTimeSlot)}
            id="btn-confirm-schedule-step"
            className="flex-1 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <span>Next: Review</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
