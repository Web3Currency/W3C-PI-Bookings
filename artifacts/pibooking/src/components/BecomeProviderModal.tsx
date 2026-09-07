import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
      <div className="relative flex w-full max-w-xs flex-col items-center rounded-2xl bg-white px-4 py-4 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-full">
          <h2
            id="become-provider-title"
            className="text-lg font-black tracking-tight text-zinc-900"
          >
            Become a Service Provider
          </h2>
        </div>

        {imageUrl && (
          <div className="mt-3 flex w-full justify-center pointer-events-none select-none">
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="block h-auto max-h-[140px] w-auto max-w-[70%] object-contain object-bottom"
              onError={() => setImageUrl(null)}
            />
          </div>
        )}

        <div className="mt-3 w-full px-1">
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-zinc-600">
            Turn your digital skills into services on Pi Network and connect with clients looking for what you do best.
          </p>
        </div>

        <div className="mt-4 w-full space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onBecomeProvider();
            }}
            id="btn-modal-become-provider"
            className="w-full rounded-xl bg-[#EA580C] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:bg-[#F97316] active:scale-[0.98]"
          >
            Apply to Become a Provider →
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
