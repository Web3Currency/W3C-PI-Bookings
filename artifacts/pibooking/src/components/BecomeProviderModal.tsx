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
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-200 bg-white text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Close modal"
        >
          Close
        </button>

        <div className="px-5 pb-5 pt-7 sm:px-6 sm:pb-6">
          {imageUrl && (
            <div className="mb-1 flex w-full justify-center pointer-events-none select-none">
              <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className="block h-auto max-h-[250px] w-auto max-w-[88%] object-contain object-bottom"
                onError={() => setImageUrl(null)}
              />
            </div>
          )}

          <div className="space-y-2">
            <h2
              id="become-provider-title"
              className="text-xl font-black tracking-tight text-zinc-900"
            >
              Become a Service Provider
            </h2>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-600">
              Turn your digital skills into services on Pi Network and connect with clients looking for what you do best.
            </p>
          </div>

          <div className="mt-5 space-y-2">
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
              className="w-full py-2 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
