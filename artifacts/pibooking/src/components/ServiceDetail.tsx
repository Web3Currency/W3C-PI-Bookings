import React, { useEffect, useState } from 'react';
import { Service, BusinessProfile, Provider } from '../types';
import { BookingProgressBar } from './BookingProgressBar';
import { providerService } from '../services/providerService';
import { providerMediaService } from '../services/providerMediaService';

interface ServiceDetailProps {
  service: Service;
  business: BusinessProfile;
  onBack: () => void;
  onProceedToBooking: () => void;
  onOpenProviderProfile?: (provider: Provider) => void;
}

export const ServiceDetail: React.FC<ServiceDetailProps> = ({ service, business, onBack, onProceedToBooking, onOpenProviderProfile }) => {
  const [resolvedProvider, setResolvedProvider] = useState<Provider | null>(service.provider || null);

  useEffect(() => {
    let mounted = true;
    if (service.provider) {
      setResolvedProvider(service.provider);
      return () => { mounted = false; };
    }
    if (!service.providerId) return () => { mounted = false; };
    providerService.getProvidersAsync().then((providers) => {
      if (mounted) setResolvedProvider(providers.find((p) => p.id === service.providerId) || null);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [service.provider, service.providerId]);

  const coverImage = service.coverImageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80';
  const providerName = resolvedProvider?.fullName || service.providerName;
  const providerRole = resolvedProvider?.roleTitle || service.providerRole;
  const providerPhoto = providerMediaService.getMediaUrl(resolvedProvider?.photoUrl);
  const providerAvatar = providerPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(providerName || 'Provider')}`;

  return (
    <div className="space-y-6 pb-28 animate-in fade-in slide-in-from-right-4 duration-200">
      <BookingProgressBar currentStep={1} />
      <div className="flex items-center justify-between">
        <button onClick={onBack} id="btn-back-to-browse" className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer">← Back to Services</button>
      </div>

      <div className="relative rounded-3xl overflow-hidden bg-zinc-100 shadow-md">
        <div className="h-52 sm:h-64 w-full relative">
          <img src={coverImage} alt={service.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/30 to-transparent" />
        </div>
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
          <div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider mb-2 shadow-xs">{service.category.replace('_', ' ')}</span>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">{service.name}</h1>
          </div>
          <div className="text-right shrink-0"><div className="text-2xl font-black text-orange-400 drop-shadow-md">{service.pricePi} <span className="text-sm font-bold text-orange-300">π</span></div></div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white shadow-sm space-y-4">
        <div className="text-xs text-zinc-500 font-medium">Offered by <strong className="text-zinc-900 font-bold">{business.name}</strong></div>
        <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-normal">{service.description}</p>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-50 space-y-0.5"><span className="block text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">Estimated Duration</span><span className="font-extrabold text-zinc-900 text-xs">{service.durationMinutes} minutes</span></div>
          <div className="p-3.5 rounded-2xl bg-zinc-50 space-y-0.5 min-w-0"><span className="block text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">Service Mode</span><span className="font-extrabold text-zinc-900 text-xs truncate block">{service.locationType}</span></div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">Service Deliverables & Inclusions</h2>
        <ul className="space-y-2.5">{service.included.map((item, idx) => <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-800 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0" /><span>{item}</span></li>)}</ul>
      </div>

      <div className="p-5 rounded-3xl bg-white shadow-sm flex items-center gap-4">
        <img src={providerAvatar} alt={providerName} className="w-12 h-12 rounded-full object-cover shrink-0 bg-orange-100" />
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-extrabold text-zinc-900 text-sm">{providerName}</div>
          <p className="text-orange-600 font-bold mt-0.5">{providerRole}</p>
          {resolvedProvider?.piUsername && <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">@{resolvedProvider.piUsername.replace(/^@+/, '')}</p>}
        </div>
        {resolvedProvider && onOpenProviderProfile && <button type="button" onClick={() => onOpenProviderProfile(resolvedProvider)} className="shrink-0 text-[11px] font-bold text-orange-700 hover:text-orange-800 whitespace-nowrap">View Provider Profile</button>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-100 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="text-xs"><span className="block text-zinc-400 font-bold uppercase text-[10px]">Total Price</span><span className="text-xl font-black text-zinc-900">{service.pricePi} <span className="text-xs font-bold text-orange-600">π</span></span></div>
          <button onClick={onProceedToBooking} id="btn-proceed-to-schedule" className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs sm:text-sm transition shadow-sm cursor-pointer">Book Now</button>
        </div>
      </div>
    </div>
  );
};