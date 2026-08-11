import React, { useState } from 'react';
import { BusinessProfile, Provider, Service } from '../types';

export interface MerchantCardProps {
  /** Accepts either a BusinessProfile or a Provider object from database */
  merchant?: BusinessProfile | Provider | null;
  /** Optional array of published services to compute active services count */
  services?: Service[];
  /** Optional override title/name */
  title?: string;
  /** Optional custom badge text */
  badgeText?: string;
  /** Action button click handler passing the merchant */
  onOpenAbout?: (merchant?: BusinessProfile | Provider) => void;
  /** Custom action label */
  actionLabel?: string;
  /** Optional container class overrides */
  className?: string;
  /** Show badge header tag */
  showBadge?: boolean;
}

export const MerchantCard: React.FC<MerchantCardProps> = ({
  merchant,
  services = [],
  title,
  badgeText,
  onOpenAbout,
  actionLabel = 'View Profile',
  className = '',
  showBadge = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const isBusiness = merchant && 'avatarUrl' in merchant;
  const isProvider = merchant && 'fullName' in merchant;

  // 1. Name
  const rawName =
    title ||
    (isBusiness ? (merchant as BusinessProfile).name : undefined) ||
    (isProvider ? (merchant as Provider).fullName : undefined);
  const name = rawName && rawName.trim().length > 0 ? rawName.trim() : 'Service Merchant';

  // 2. Avatar
  const rawPhoto =
    (isBusiness ? (merchant as BusinessProfile).avatarUrl : undefined) ||
    (isProvider ? (merchant as Provider).photoUrl : undefined);

  const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=ea580c,f97316&textColor=ffffff`;

  const avatarUrl = !imgError && rawPhoto && rawPhoto.trim().length > 0 ? rawPhoto.trim() : fallbackAvatar;

  // 3. Headline / Role
  const headline =
    (isBusiness
      ? (merchant as BusinessProfile).headline || (merchant as BusinessProfile).tagline
      : (merchant as Provider).headline || (merchant as Provider).roleTitle) || 'Service Provider';

  // 4. Bio / Positioning
  const rawBio =
    (isBusiness ? (merchant as BusinessProfile).bio : undefined) ||
    (isProvider ? (merchant as Provider).bio : undefined);
  const bio = rawBio && rawBio.trim().length > 0 ? rawBio.trim() : null;

  // 5. Specialty / Skill tags
  const specialties =
    (isBusiness
      ? (merchant as BusinessProfile).specialties
      : (merchant as Provider).specialties) || [];
  const skills = isProvider ? (merchant as Provider).skills || [] : [];
  const allTags = Array.from(new Set([...specialties, ...skills])).slice(0, 3);

  // 6. Real Rating & Reviews (NO fake numbers)
  const rating = merchant?.rating;
  const reviewsCount = merchant?.reviewsCount;
  const hasRealRating = rating !== undefined && rating !== null && Number(rating) > 0 && reviewsCount !== undefined && Number(reviewsCount) > 0;

  // 7. Availability Status
  const availabilityStatus = isProvider
    ? (merchant as Provider).availabilityStatus || 'available'
    : isBusiness
    ? (merchant as BusinessProfile).availabilityStatus || 'available'
    : 'available';

  // 8. Published Services Count
  const publishedServicesCount = services.filter((s) => {
    if (s.status !== 'Published') return false;
    if (isProvider) {
      return s.providerId === merchant?.id;
    }
    if (isBusiness) {
      return !s.providerId || s.providerId === merchant?.id;
    }
    return true;
  }).length;

  // Location
  const location = isProvider
    ? (merchant as Provider).location || (merchant as Provider).serviceMode || 'Remote'
    : (merchant as BusinessProfile).location || 'Global / Remote';

  return (
    <div
      className={`relative rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between text-zinc-900 space-y-4 ${className}`}
    >
      {/* Top Section */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            {showBadge && availabilityStatus && (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                {availabilityStatus}
              </span>
            )}

            <h3 className="text-base font-black tracking-tight text-zinc-900 truncate">
              {name}
            </h3>

            <p className="text-xs font-bold text-orange-600 line-clamp-1">
              {headline}
            </p>

            <p className="text-[11px] text-zinc-500 font-medium truncate">
              {location}
            </p>
          </div>

          {/* Avatar Photo */}
          <div className="w-14 h-14 rounded-full bg-orange-100 p-0.5 shrink-0 overflow-hidden">
            <img
              src={avatarUrl}
              alt={name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        {/* Bio excerpt */}
        {bio && (
          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-normal">
            {bio}
          </p>
        )}

        {/* Specialty Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {allTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-block text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
        {/* Rating or Active Services status */}
        <div className="flex items-center gap-2">
          {hasRealRating ? (
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="font-extrabold text-zinc-900">{Number(rating).toFixed(1)} ★</span>
              <span className="text-zinc-500 font-medium text-[11px]">({reviewsCount})</span>
            </div>
          ) : (
            <span className="inline-block text-[10px] font-bold text-orange-950 bg-orange-100/70 px-2.5 py-0.5 rounded-full">
              {publishedServicesCount > 0 ? `${publishedServicesCount} Services` : 'Verified Provider'}
            </span>
          )}
        </div>

        {/* Action Button */}
        {onOpenAbout && (
          <button
            onClick={() => onOpenAbout(merchant || undefined)}
            id={`btn-view-profile-${merchant?.id || 'default'}`}
            className="px-4 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition cursor-pointer shrink-0"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
