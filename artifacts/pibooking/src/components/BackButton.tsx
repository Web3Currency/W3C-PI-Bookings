import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  id?: string;
  className?: string;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, id, className = '', label = 'Go back' }) => (
  <button
    type="button"
    onClick={onClick}
    id={id}
    aria-label={label}
    title={label}
    className={`w-10 h-10 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 hover:bg-amber-100 hover:text-amber-800 transition inline-flex items-center justify-center shrink-0 cursor-pointer ${className}`}
  >
    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
  </button>
);
