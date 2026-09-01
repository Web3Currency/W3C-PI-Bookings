import React, { useEffect, useState } from 'react';
import { settingsService } from '../services/settingsService';

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    settingsService.getSettings().then((settings) => {
      if (!cancelled) setImageUrl(settings.become_provider_popup_image_url);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="become-provider-title"
    >
      <div className="relative flex w-full max-w-sm flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-10 rounded-lg px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Close modal"
        >
          Close
        </button>

        {imageUrl && (
          <div className="flex w-full justify-center pointer-events-none select-none">
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="block h-auto max-h-[300px] w-auto max-w-[92%] object-contain object-bottom"
              onError={() => setImageUrl(null)}
            />
          </div>
        )}

        <div className="mt-1 w-full px-3">
          <h2
            id="become-provider-title"
            className="text-xl font-black tracking-tight text-white drop-shadow-sm"
          >
            Become a Service Provider
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/90 drop-shadow-sm">
            Turn your digital skills into services on Pi Network and connect with clients looking for what you do best.
          </p>
        </div>

        <div className="mt-5 w-full px-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onBecomeProvider();
            }}
            id="btn-modal-become-provider"
            className="w-full rounded-xl bg-[#EA580C] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:bg-[#F97316] active:scale-[0.98]"
          >
            Apply to Become a Provider →
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-white/80 transition hover:text-white"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
