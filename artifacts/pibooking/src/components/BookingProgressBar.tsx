import React from 'react';
import { Check } from 'lucide-react';

interface BookingProgressBarProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { step: 1, label: 'Contact & Brief' },
  { step: 2, label: 'Summary' },
  { step: 3, label: 'Payment' },
];

export const BookingProgressBar: React.FC<BookingProgressBarProps> = ({ currentStep }) => {
  const progressWidth = `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`;

  return (
    <div className="w-full py-2 px-1 mb-4">
      <div className="relative flex items-center justify-between">
        <div className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-3.5 h-0.5 bg-zinc-200 z-0">
          <div
            className="h-full bg-amber-600 transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>

        {STEPS.map((s) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div key={s.step} className="flex flex-col items-center relative z-10 shrink-0 max-w-[30%]">
              <div
                className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-200 border-2 ${
                  isCompleted
                    ? 'bg-amber-600 text-white border-amber-600'
                    : isCurrent
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-zinc-400 border-zinc-200'
                }`}
              >
                {isCurrent && (
                  <span className="absolute inset-[-5px] rounded-full border-2 border-amber-500/40 animate-ping" aria-hidden="true" />
                )}
                <span className="relative z-10">
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold mt-1.5 text-center leading-tight transition-colors ${
                  isCurrent
                    ? 'text-amber-800 font-extrabold'
                    : isCompleted
                    ? 'text-zinc-800'
                    : 'text-zinc-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
