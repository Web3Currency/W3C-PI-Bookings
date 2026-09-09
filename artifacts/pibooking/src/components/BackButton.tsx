import React from 'react';
import { ArrowLeft } from 'lucide-react';

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
    className={`w-10 h-10 rounded-full bg-zinc-100 text-zinc-800 hover:bg-orange-50 hover:text-orange-700 transition inline-flex items-center justify-center shrink-0 cursor-pointer ${className}`}
  >
    <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
  </button>
);
