import React from 'react';
import { LockKeyhole } from 'lucide-react';

interface AuthRequiredViewProps {
  title: string;
  description: string;
  onSignIn?: () => void;
}

export const AuthRequiredView: React.FC<AuthRequiredViewProps> = ({ title, description, onSignIn }) => (
  <div className="max-w-md mx-auto text-center py-16 px-4 space-y-4 animate-in fade-in duration-200">
    <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
      <LockKeyhole className="w-8 h-8 stroke-[2]" />
    </div>
    <div className="space-y-1.5">
      <h2 className="text-xl font-black text-zinc-900">{title}</h2>
      <p className="text-xs text-zinc-500 max-w-xs mx-auto font-medium leading-relaxed">{description}</p>
    </div>
    <button
      type="button"
      onClick={onSignIn}
      className="py-3 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition shadow-md shadow-amber-600/20 active:scale-[0.98] cursor-pointer"
    >
      Sign in with Pi
    </button>
  </div>
);
