import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { BusinessProfile, Provider } from '../types';
import { providerMediaService } from '../services/providerMediaService';

interface MerchantCardProps {
  merchant: BusinessProfile | Provider;
  services?: any[];
  title?: string;
  onOpenAbout?: (merchant?: BusinessProfile | Provider) => void;
  actionLabel?: string;
  className?: string;
  showBadge?: boolean;
  compact?: boolean;
}

export const MerchantCard: React.FC<MerchantCardProps> = ({
  merchant,
  services = [],
  title,
  onOpenAbout,
  actionLabel = 'View Profile',
  className = '',
  showBadge = true,
  compact = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const isBusiness = !!merchant && 'avatarUrl' in merchant;
  const isProvider = !!merchant && 'fullName' in merchant;
  const name = (title || (isBusiness ? (merchant as BusinessProfile).name : (merchant as Provider).fullName) || '').trim();
  const rawPhoto = isBusiness ? (merchant as BusinessProfile).avatarUrl : (merchant as Provider).photoUrl;
  const photoUrl = providerMediaService.getMediaUrl(rawPhoto)?.trim();
  const avatarUrl = !imgError && photoUrl ? photoUrl : undefined;
  const headline = isBusiness ? ((merchant as BusinessProfile).headline || (merchant as BusinessProfile).tagline || '') : ((merchant as Provider).headline || (merchant as Provider).roleTitle || '');
  const bio = isBusiness ? (merchant as BusinessProfile).bio : (merchant as Provider).bio;
  const rating = merchant?.rating;
  const reviewsCount = merchant?.reviewsCount;
  const hasRealRating = rating != null && Number(rating) > 0 && reviewsCount != null && Number(reviewsCount) > 0;
  const publishedServicesCount = services.filter(s => s.status === 'Published' && (!isProvider || s.providerId === merchant?.id)).length;
  const rawAvailability = isProvider ? (merchant as Provider).availabilityStatus : undefined;
  const availabilityStatus = rawAvailability === 'online' || rawAvailability === 'offline' ? rawAvailability : undefined;
  const profileVerified = isProvider && (merchant as Provider).profileVerified === true;
  const isTestAccount = isProvider && (merchant as Provider).isTestAccount === true;
  const roleTitle = isProvider ? ((merchant as Provider).roleTitle || '').trim() : '';

  const openProfile = () => onOpenAbout?.(merchant);

  if (compact) {
    return (
      <div role={onOpenAbout ? 'button' : undefined} tabIndex={onOpenAbout ? 0 : undefined} onClick={openProfile} onKeyDown={(e) => { if (onOpenAbout && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openProfile(); } }} className={`relative w-full aspect-square rounded-2xl bg-zinc-50 hover:bg-orange-50/60 border border-zinc-200/70 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col text-left overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40 p-3 ${className}`} aria-label={onOpenAbout ? `View ${name} profile` : undefined}>
        {showBadge && availabilityStatus && <span className={`absolute top-2 right-2 z-10 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${availabilityStatus === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{availabilityStatus}</span>}
        <div className="flex-1 min-h-0 flex flex-col items-start justify-start pt-1 pr-1 pb-3">
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-orange-100 p-0.5 overflow-hidden shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt={name} onError={() => setImgError(true)} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-orange-700 font-black text-xl bg-orange-100">{name.charAt(0).toUpperCase() || '?'}</div>}
          </div>
          <div className="w-full mt-2 min-h-0">
            <div className="flex items-center justify-start gap-1 min-w-0 flex-nowrap">
              <h3 className="min-w-0 truncate font-black text-sm sm:text-base leading-tight tracking-tight text-zinc-900">{name}</h3>
              {isTestAccount && <span className="shrink-0 rounded-sm border border-purple-700 bg-purple-600 px-1.5 py-0 text-[8px] leading-4 font-black uppercase tracking-wide text-white">TEST</span>}
              {showBadge && profileVerified && <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-orange-600 fill-orange-100" strokeWidth={2.2} aria-label="Verified by W3C Pi Bookings" />}
            </div>
            {roleTitle && <p className="mt-0.5 max-w-full truncate text-[10px] sm:text-[11px] leading-tight font-bold text-orange-600">{roleTitle}</p>}
          </div>
        </div>
        <div className="w-full pt-2 border-t border-zinc-200/80 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-zinc-500 shrink-0">
          <span>{publishedServicesCount > 0 ? `${publishedServicesCount} ${publishedServicesCount === 1 ? 'Service' : 'Services'}` : 'Service Provider'}</span>
          <span className="text-orange-600 text-base leading-none" aria-hidden="true">›</span>
        </div>
      </div>
    );
  }

  const rootClass = `relative rounded-2xl bg-zinc-50 hover:bg-orange-50/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between text-zinc-900 space-y-4 ${className}`;
  return (
    <div className={rootClass}>
      {showBadge && availabilityStatus && <span className={`absolute top-3 right-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${availabilityStatus === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{availabilityStatus}</span>}
      <div>
        <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
          <h3 className="min-w-0 truncate text-base font-black tracking-tight text-zinc-900">{name}</h3>
          {isTestAccount && <span className="shrink-0 rounded-sm border border-purple-700 bg-purple-600 px-1.5 py-0 text-[8px] leading-4 font-black uppercase tracking-wide text-white">TEST</span>}
          {showBadge && profileVerified && <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-orange-600 fill-orange-100" strokeWidth={2.2} aria-label="Verified by W3C Pi Bookings" />}
        </div>
        {isProvider ? (roleTitle && <p className="mt-1 text-xs font-bold text-orange-600 line-clamp-1">{roleTitle}</p>) : (headline && <p className="mt-1 text-xs font-bold text-orange-600 line-clamp-1">{headline}</p>)}
        {bio && <p className="mt-3 text-xs text-zinc-600 line-clamp-2 leading-relaxed">{bio}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-orange-100 p-0.5 overflow-hidden shrink-0">{avatarUrl ? <img src={avatarUrl} alt={name} onError={() => setImgError(true)} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-orange-700 font-black text-lg">{name.charAt(0).toUpperCase() || '?'}</div>}</div>
        <div className="min-w-0 flex-1">{hasRealRating && <div className="text-xs font-bold text-zinc-800">{Number(rating).toFixed(1)} ★ <span className="font-medium text-zinc-500">({reviewsCount})</span></div>}<div className="text-[10px] font-bold text-zinc-500">{publishedServicesCount} {publishedServicesCount === 1 ? 'Service' : 'Services'}</div></div>
        {onOpenAbout && <button type="button" onClick={openProfile} className="px-4 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition cursor-pointer">{actionLabel}</button>}
      </div>
    </div>
  );
};