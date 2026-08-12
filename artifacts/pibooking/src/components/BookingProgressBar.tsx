import React from 'react';
import { Check } from 'lucide-react';

interface BookingProgressBarProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { step: 1, label: 'Details' },
  { step: 2, label: 'Schedule' },
  { step: 3, label: 'Summary' },
  { step: 4, label: 'Payment' },
];

export const BookingProgressBar: React.FC<BookingProgressBarProps> = ({ currentStep }) => {
  return (
    <div className="w-full py-2 px-1 mb-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line & Active Fill Line */}
        <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-zinc-200 -z-0">
          <div
            className="h-full bg-amber-600 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((s) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div key={s.step} className="flex flex-col items-center relative z-10 shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-200 border-2 ${
                  isCompleted
                    ? 'bg-amber-600 text-white border-amber-600'
                    : isCurrent
                    ? 'bg-amber-600 text-white border-amber-600 ring-4 ring-amber-600/20 scale-110'
                    : 'bg-white text-zinc-400 border-zinc-200'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
              </div>
              <span
                className={`text-[10px] font-bold mt-1.5 transition-colors ${
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
