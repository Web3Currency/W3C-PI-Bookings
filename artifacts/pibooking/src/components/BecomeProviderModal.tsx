import React from 'react';
import { Briefcase, X, Sparkles, ShieldCheck, Coins } from 'lucide-react';

interface BecomeProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBecomeProvider: () => void;
}

export const BecomeProviderModal: React.FC<BecomeProviderModalProps> = ({
  isOpen,
  onClose,
  onBecomeProvider,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-zinc-200 p-6 space-y-4 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
          <Briefcase className="w-7 h-7" />
        </div>

        {/* Header Text */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Join W3C Network</span>
          </div>
          <h2 className="text-lg font-black text-zinc-900 tracking-tight">
            Become a Service Provider
          </h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Monetize your skills and digital services on Pi Network. Earn Pi cryptocurrency directly from Pioneers worldwide.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/80 space-y-2 text-left text-xs">
          <div className="flex items-center gap-2 text-zinc-800 font-medium">
            <Coins className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Earn Pi for your professional skills</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Protected with Pi Escrow payment guarantee</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onClose();
              onBecomeProvider();
            }}
            id="btn-modal-become-provider"
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20"
          >
            <Briefcase className="w-4 h-4" />
            <span>Apply to Become a Provider →</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
